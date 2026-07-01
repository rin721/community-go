package service

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"runtime"
	"strings"
	"sync/atomic"
	"time"

	"github.com/open-console/console-platform/internal/modules/deploy/model"
	"github.com/open-console/console-platform/internal/modules/deploy/orchestrator"
	"github.com/open-console/console-platform/internal/modules/deploy/queue"
)

// impl 是 Service 接口的内部实现。
type impl struct {
	cfg      Config
	verifier SignatureVerifier
	logger   Logger

	// latest 保存最近一次部署记录的原子快照，供无锁读取。
	latest atomic.Pointer[model.DeployRecord]

	// orchestrator 管理部署流水线和进程切换状态机。
	orchestrator   *orchestrator.Orchestrator
	customLauncher orchestrator.Launcher
}

// New 创建并返回 Service 实现。
func New(cfg Config, logger Logger) (Service, error) {
	cfg.Env = strings.TrimSpace(cfg.Env)
	if cfg.Env == "" {
		cfg.Env = "development"
	}

	verifier, err := NewVerifier(cfg.Provider, cfg.Secret, cfg.RequireSecret)
	if err != nil {
		return nil, fmt.Errorf("deploy service: create verifier: %w", err)
	}

	s := &impl{
		cfg:      cfg,
		verifier: verifier,
		logger:   logger,
	}

	oCfg := orchestrator.Config{
		WorkDir:           cfg.WorkDir,
		Branch:            cfg.Branch,
		BuildCmd:          cfg.BuildCmd,
		BinaryPath:        cfg.BinaryPath,
		HeartbeatInterval: time.Duration(cfg.HeartbeatIntervalSeconds) * time.Second,
		GateBuffer:        time.Duration(cfg.GateBufferSeconds) * time.Second,
	}
	if oCfg.HeartbeatInterval <= 0 {
		oCfg.HeartbeatInterval = 10 * time.Second
	}
	if oCfg.GateBuffer <= 0 {
		oCfg.GateBuffer = 15 * time.Second
	}

	q := queue.New()
	orch, err := orchestrator.NewOrchestrator(
		oCfg,
		q,
		s, // Builder
		s, // Launcher (default, will use customLauncher if set)
		logger,
		s.storeRecord,
		s.newRecordFromCommit,
		appendLog,
	)
	if err != nil {
		return nil, fmt.Errorf("deploy service: create orchestrator: %w", err)
	}

	s.orchestrator = orch
	orch.Start(context.Background())

	return s, nil
}

// SetLauncher 用于注入外部进程管理器（如 cliapp 托管的 Launcher）。
func (s *impl) SetLauncher(l orchestrator.Launcher) {
	s.customLauncher = l
	s.orchestrator.SetLauncher(s)
}

// ─── Service interface ────────────────────────────────────────────────────────

func (s *impl) Env() string {
	return s.cfg.Env
}

func (s *impl) State() string {
	if s.orchestrator == nil {
		return string(model.StateIdle)
	}
	return string(s.orchestrator.State())
}

func (s *impl) LatestStatus() *model.DeployRecord {
	return s.latest.Load()
}

// HandleWebhook 校验签名 → 解析 payload → 按环境决策 → 触发部署状态机。
func (s *impl) HandleWebhook(ctx context.Context, rawBody []byte, headers map[string]string) (*model.DeployRecord, error) {
	// 1. 签名校验
	if err := s.verifier.Verify(rawBody, headers); err != nil {
		return nil, fmt.Errorf("webhook verification failed: %w", err)
	}

	// 2. 解析 Push Payload（支持 GitHub / GitLab / 通用结构）
	payload, err := parsePushPayload(rawBody, headers)
	if err != nil {
		return nil, fmt.Errorf("parse push payload: %w", err)
	}

	// 3. 提取分支名（ref: refs/heads/main → main）
	branch := extractBranchFromRef(payload.Ref)

	// 4. 非目标分支，忽略
	if s.cfg.Branch != "" && branch != s.cfg.Branch {
		s.logInfo("deploy: ignoring push to branch", "branch", branch, "target", s.cfg.Branch)
		record := s.newRecord(payload, branch, model.DeployStatusSkipped)
		record.Error = fmt.Sprintf("branch %q is not monitored (target: %q)", branch, s.cfg.Branch)
		s.storeRecord(record)
		return record, nil
	}

	// 5. 无新 commit（空提交列表），忽略
	if payload.CommitID == "" {
		s.logInfo("deploy: no new commits in push event, skipping")
		record := s.newRecord(payload, branch, model.DeployStatusSkipped)
		record.Error = "no new commits"
		s.storeRecord(record)
		return record, nil
	}

	// 6. 开发环境，跳过
	if strings.EqualFold(s.cfg.Env, "development") {
		s.logInfo("deploy: environment is development, skipping deployment",
			"commit", payload.CommitID, "branch", branch)
		record := s.newRecord(payload, branch, model.DeployStatusSkipped)
		record.Error = "environment is development"
		s.storeRecord(record)
		return record, nil
	}

	// 7. 创建 pending 记录并返回，通过状态机触发异步部署
	record := s.newRecord(payload, branch, model.DeployStatusPending)
	s.storeRecord(record)

	oRecord := oRecordFromDeployRecord(record)
	s.orchestrator.Trigger(oRecord.CommitID)

	return record, nil
}

// ─── orchestrator.Builder interface ──────────────────────────────────────────

func (s *impl) Sync(ctx context.Context, record *model.DeployRecord) error {
	return s.stepGitSync(record)
}

func (s *impl) Build(ctx context.Context, record *model.DeployRecord) error {
	return s.stepBuild(record)
}

// ─── orchestrator.Launcher interface ─────────────────────────────────────────

func (s *impl) Launch(ctx context.Context, record *model.DeployRecord, ipcAddr string) error {
	if s.customLauncher != nil {
		return s.customLauncher.Launch(ctx, record, ipcAddr)
	}
	return s.stepStart(record)
}

// ─── Pipeline steps ──────────────────────────────────────────────────────────

// stepGitSync 执行 git clone（首次）或 git fetch + reset（已有目录）。
func (s *impl) stepGitSync(record *model.DeployRecord) error {
	workDir := strings.TrimSpace(s.cfg.WorkDir)
	if workDir == "" {
		workDir = "."
	}

	// 判断 .git 目录是否存在
	gitDir := workDir + "/.git"
	if _, err := os.Stat(gitDir); os.IsNotExist(err) {
		// 首次部署：git clone
		if strings.TrimSpace(s.cfg.RepoURL) == "" {
			return fmt.Errorf("repo_url is required for initial clone")
		}
		args := []string{"clone", "--branch", s.cfg.Branch, "--depth", "1", s.cfg.RepoURL, workDir}
		return s.runCmd(record, "git", args...)
	}

	// 已有仓库：fetch + reset
	if err := s.runCmd(record, "git", "-C", workDir, "fetch", "origin", s.cfg.Branch); err != nil {
		return err
	}
	return s.runCmd(record, "git", "-C", workDir, "reset", "--hard", "origin/"+s.cfg.Branch)
}

// stepBuild 执行编译命令。
func (s *impl) stepBuild(record *model.DeployRecord) error {
	buildCmd := strings.TrimSpace(s.cfg.BuildCmd)
	if buildCmd == "" {
		appendLog(record, "[build] build_cmd is empty, skipping")
		return nil
	}
	return s.runShell(record, buildCmd)
}

// stepStart 执行启动命令（可选，默认的 fallback 启动方式）。
func (s *impl) stepStart(record *model.DeployRecord) error {
	// 在启动新进程前，我们需要先优雅停止旧进程（若配置了 stop_cmd 且使用 legacy 启动）
	_ = s.stepStop(record)

	startCmd := strings.TrimSpace(s.cfg.StartCmd)
	if startCmd == "" {
		appendLog(record, "[start] start_cmd is empty, skipping")
		return nil
	}
	return s.runShell(record, startCmd)
}

// stepStop 执行停止命令（可选）。
func (s *impl) stepStop(record *model.DeployRecord) error {
	stopCmd := strings.TrimSpace(s.cfg.StopCmd)
	if stopCmd == "" {
		appendLog(record, "[stop] stop_cmd is empty, skipping")
		return nil
	}
	// stop 命令失败不阻断流水线（best-effort）
	if err := s.runShell(record, stopCmd); err != nil {
		appendLog(record, fmt.Sprintf("[stop] warning: %v (continuing)", err))
	}
	return nil
}

// ─── Command execution ────────────────────────────────────────────────────────

// runCmd 执行指定命令及参数，超时受 cfg.TimeoutSeconds 控制。
func (s *impl) runCmd(record *model.DeployRecord, name string, args ...string) error {
	timeout := time.Duration(s.cfg.TimeoutSeconds) * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = strings.TrimSpace(s.cfg.WorkDir)
	return s.captureOutput(record, cmd, fmt.Sprintf("%s %s", name, strings.Join(args, " ")))
}

// runShell 通过 sh -c（Linux/macOS）执行 shell 命令字符串。
func (s *impl) runShell(record *model.DeployRecord, command string) error {
	timeout := time.Duration(s.cfg.TimeoutSeconds) * time.Second
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	var cmd *exec.Cmd
	if isWindows() {
		cmd = exec.CommandContext(ctx, "cmd", "/C", command)
	} else {
		cmd = exec.CommandContext(ctx, "sh", "-c", command)
	}
	cmd.Dir = strings.TrimSpace(s.cfg.WorkDir)
	return s.captureOutput(record, cmd, command)
}

// captureOutput 启动命令并把 stdout/stderr 实时追加到 record.Logs。
func (s *impl) captureOutput(record *model.DeployRecord, cmd *exec.Cmd, label string) error {
	var buf bytes.Buffer
	pr, pw := io.Pipe()
	cmd.Stdout = pw
	cmd.Stderr = pw

	// 在 goroutine 中逐行读取输出
	done := make(chan struct{})
	go func() {
		defer close(done)
		scanner := bufio.NewScanner(pr)
		for scanner.Scan() {
			line := scanner.Text()
			appendLog(record, line)
			buf.WriteString(line + "\n")
		}
	}()

	if err := cmd.Start(); err != nil {
		pw.Close()
		<-done
		return fmt.Errorf("start %q: %w", label, err)
	}

	runErr := cmd.Wait()
	pw.Close()
	<-done

	if runErr != nil {
		return fmt.Errorf("run %q: %w", label, runErr)
	}
	return nil
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func (s *impl) newRecord(payload *model.PushPayload, branch string, status model.DeployStatus) *model.DeployRecord {
	return &model.DeployRecord{
		ID:        fmt.Sprintf("%d", time.Now().UnixMilli()),
		CommitID:  payload.CommitID,
		Branch:    branch,
		Pusher:    payload.Pusher,
		Status:    status,
		StartedAt: time.Now(),
		Logs:      make([]string, 0, 8),
	}
}

func (s *impl) newRecordFromCommit(commitID string) *model.DeployRecord {
	latest := s.latest.Load()
	var branch, pusher string
	if latest != nil {
		branch = latest.Branch
		pusher = latest.Pusher
	}
	return &model.DeployRecord{
		ID:        fmt.Sprintf("%d", time.Now().UnixMilli()),
		CommitID:  commitID,
		Branch:    branch,
		Pusher:    pusher,
		Status:    model.DeployStatusPending,
		StartedAt: time.Now(),
		Logs:      make([]string, 0, 8),
	}
}

func (s *impl) storeRecord(record *model.DeployRecord) {
	if s.cfg.LogMaxLines > 0 && len(record.Logs) > s.cfg.LogMaxLines {
		overflow := len(record.Logs) - s.cfg.LogMaxLines
		record.Logs = record.Logs[overflow:]
	}
	s.latest.Store(record)
}

func (s *impl) logInfo(msg string, keysAndValues ...any) {
	if s.logger != nil {
		s.logger.Info(msg, keysAndValues...)
	}
}

func (s *impl) logError(msg string, keysAndValues ...any) {
	if s.logger != nil {
		s.logger.Error(msg, keysAndValues...)
	}
}

func appendLog(record *model.DeployRecord, line string) {
	record.Logs = append(record.Logs, fmt.Sprintf("[%s] %s", time.Now().Format("15:04:05"), line))
}

func oRecordFromDeployRecord(r *model.DeployRecord) *model.DeployRecord {
	return r
}

// ─── Payload parsing ──────────────────────────────────────────────────────────

// parsePushPayload 尝试按 GitHub / GitLab 通用 JSON 结构解析 Push 事件。
func parsePushPayload(body []byte, headers map[string]string) (*model.PushPayload, error) {
	if len(body) == 0 {
		return nil, fmt.Errorf("empty webhook body")
	}

	var raw map[string]json.RawMessage
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, fmt.Errorf("invalid JSON body: %w", err)
	}

	payload := &model.PushPayload{}

	// ref: refs/heads/main (GitHub & GitLab 相同)
	if v, ok := raw["ref"]; ok {
		_ = json.Unmarshal(v, &payload.Ref)
	}

	// head_commit.id (GitHub)
	if v, ok := raw["head_commit"]; ok {
		var headCommit map[string]json.RawMessage
		if json.Unmarshal(v, &headCommit) == nil {
			if id, ok := headCommit["id"]; ok {
				_ = json.Unmarshal(id, &payload.CommitID)
			}
			if msg, ok := headCommit["message"]; ok {
				_ = json.Unmarshal(msg, &payload.CommitMsg)
			}
		}
	}

	// after (GitHub 最新 commit SHA)
	if payload.CommitID == "" {
		if v, ok := raw["after"]; ok {
			_ = json.Unmarshal(v, &payload.CommitID)
		}
	}

	// checkout_sha (GitLab)
	if payload.CommitID == "" {
		if v, ok := raw["checkout_sha"]; ok {
			_ = json.Unmarshal(v, &payload.CommitID)
		}
	}

	// pusher.name (GitHub) / user_name (GitLab)
	if v, ok := raw["pusher"]; ok {
		var pusher map[string]json.RawMessage
		if json.Unmarshal(v, &pusher) == nil {
			if name, ok := pusher["name"]; ok {
				_ = json.Unmarshal(name, &payload.Pusher)
			}
		}
	}
	if payload.Pusher == "" {
		if v, ok := raw["user_name"]; ok {
			_ = json.Unmarshal(v, &payload.Pusher)
		}
	}

	// repository.full_name (GitHub) / project.path_with_namespace (GitLab)
	if v, ok := raw["repository"]; ok {
		var repo map[string]json.RawMessage
		if json.Unmarshal(v, &repo) == nil {
			if name, ok := repo["full_name"]; ok {
				_ = json.Unmarshal(name, &payload.Repository)
			}
		}
	}
	if payload.Repository == "" {
		if v, ok := raw["project"]; ok {
			var proj map[string]json.RawMessage
			if json.Unmarshal(v, &proj) == nil {
				if ns, ok := proj["path_with_namespace"]; ok {
					_ = json.Unmarshal(ns, &payload.Repository)
				}
			}
		}
	}

	return payload, nil
}

// extractBranchFromRef 从 refs/heads/main 提取 main。
func extractBranchFromRef(ref string) string {
	const prefix = "refs/heads/"
	if strings.HasPrefix(ref, prefix) {
		return strings.TrimPrefix(ref, prefix)
	}
	return ref
}

// isWindows 返回当前运行时是否为 Windows，供 runShell 选择 shell 解释器使用。
// 使用 runtime.GOOS（编译期常量）进行检测，不调用任何环境变量或系统调用。
func isWindows() bool {
	return runtime.GOOS == "windows"
}
