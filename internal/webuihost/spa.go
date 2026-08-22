package webuihost

import (
	"errors"
	"fmt"
	"io/fs"
	"net/http"
	"os"
	"path"
	"path/filepath"
	"strings"

	"github.com/rin721/go-scaffold-template/pkg/httpx"
)

const (
	immutableLongTermCache = "public, max-age=31536000, immutable"
	noCache                = "no-cache"
	indexFileName          = "index.html"
)

// spaHandler 托管 WebUI 构建产物：提供服务真实文件，未命中时按 SPA 语义回退到
// index.html；被排除前缀（如 /api、/management）永远不回退 HTML。
type spaHandler struct {
	absDir            string
	excludedPrefixes  []string
	fallbackPath      string
	immutablePrefixes []string
}

// NewSPAHandler 创建静态托管处理器。
//
// dir 是托管目录（相对或绝对路径）；excludedPrefixes 中的请求路径永远不会回退
// 到 index.html，调用方负责保证这些前缀（例如 /api、/management）由其它处理器
// 服务。immutablePrefixes 中的路径命中时使用长期不可变缓存头（Vite hash 资源）。
func NewSPAHandler(dir string, excludedPrefixes []string, immutablePrefixes []string) (http.Handler, error) {
	if strings.TrimSpace(dir) == "" {
		return nil, fmt.Errorf("webui hosting dir is required")
	}
	absDir, err := filepath.Abs(dir)
	if err != nil {
		return nil, fmt.Errorf("resolve webui hosting dir %q: %w", dir, err)
	}
	if err := ValidateDir(absDir); err != nil {
		return nil, err
	}
	excluded := make([]string, 0, len(excludedPrefixes))
	for _, prefix := range excludedPrefixes {
		trimmed := strings.TrimSpace(prefix)
		if trimmed == "" {
			return nil, fmt.Errorf("webui hosting excluded prefix must not be empty")
		}
		excluded = append(excluded, trimmed)
	}
	immutable := make([]string, 0, len(immutablePrefixes))
	for _, prefix := range immutablePrefixes {
		trimmed := strings.TrimSpace(prefix)
		if trimmed == "" {
			continue
		}
		immutable = append(immutable, trimmed)
	}
	return &spaHandler{
		absDir:            absDir,
		excludedPrefixes:  excluded,
		fallbackPath:      filepath.Join(absDir, indexFileName),
		immutablePrefixes: immutable,
	}, nil
}

// ValidateDir 校验托管目录存在、是真实目录且包含常规文件 index.html。
func ValidateDir(dir string) error {
	if strings.TrimSpace(dir) == "" {
		return fmt.Errorf("webui hosting dir is required")
	}
	info, err := os.Stat(dir)
	if err != nil {
		return fmt.Errorf("webui hosting dir %q: %w", dir, err)
	}
	if !info.IsDir() {
		return fmt.Errorf("webui hosting dir %q is not a directory", dir)
	}
	indexInfo, err := os.Stat(filepath.Join(dir, indexFileName))
	if err != nil {
		return fmt.Errorf("webui hosting dir %q missing %s: %w", dir, indexFileName, err)
	}
	if !indexInfo.Mode().IsRegular() {
		return fmt.Errorf("webui hosting dir %q %s is not a regular file", dir, indexFileName)
	}
	return nil
}

func (h *spaHandler) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	if writer == nil || request == nil {
		return
	}
	requestPath := request.URL.Path
	if isUnsafePath(requestPath) {
		httpx.WriteProblem(writer, request, &httpx.StatusError{StatusCode: http.StatusBadRequest, Code: "invalid_path", Message: "request path is invalid"})
		return
	}
	if request.Method != http.MethodGet && request.Method != http.MethodHead {
		httpx.WriteProblem(writer, request, &httpx.StatusError{StatusCode: http.StatusMethodNotAllowed, Code: "method_not_allowed", Message: "method not allowed"})
		return
	}
	if h.isExcluded(requestPath) {
		httpx.WriteProblem(writer, request, &httpx.StatusError{StatusCode: http.StatusNotFound, Code: "route_not_found", Message: "route not found"})
		return
	}
	if h.serveExisting(writer, request, requestPath) {
		return
	}
	h.serveFallback(writer, request)
}

func (h *spaHandler) isExcluded(requestPath string) bool {
	for _, prefix := range h.excludedPrefixes {
		if requestPath == prefix || strings.HasPrefix(requestPath, prefix+"/") {
			return true
		}
	}
	return false
}

func (h *spaHandler) isImmutable(requestPath string) bool {
	for _, prefix := range h.immutablePrefixes {
		if requestPath == prefix || strings.HasPrefix(requestPath, prefix+"/") {
			return true
		}
	}
	return false
}

// serveExisting 返回 true 表示已写入响应；目录也按 SPA 语义回退，不列目录。
func (h *spaHandler) serveExisting(writer http.ResponseWriter, request *http.Request, requestPath string) bool {
	relative := strings.TrimPrefix(requestPath, "/")
	filePath := filepath.Join(h.absDir, filepath.FromSlash(path.Clean(relative)))
	file, err := os.Open(filePath)
	if err != nil {
		if errors.Is(err, fs.ErrNotExist) {
			return false
		}
		h.writeFailure(writer, request, http.StatusInternalServerError, "internal_error", "webui asset is unavailable")
		return true
	}
	defer func() { _ = file.Close() }()
	info, err := file.Stat()
	if err != nil {
		h.writeFailure(writer, request, http.StatusInternalServerError, "internal_error", "webui asset is unavailable")
		return true
	}
	if info.IsDir() {
		return false
	}
	h.writeCacheHeader(writer, requestPath)
	http.ServeContent(writer, request, info.Name(), info.ModTime(), file)
	return true
}

func (h *spaHandler) serveFallback(writer http.ResponseWriter, request *http.Request) {
	file, err := os.Open(h.fallbackPath)
	if err != nil {
		h.writeFailure(writer, request, http.StatusNotFound, "route_not_found", "route not found")
		return
	}
	defer func() { _ = file.Close() }()
	info, err := file.Stat()
	if err != nil || info.IsDir() {
		h.writeFailure(writer, request, http.StatusNotFound, "route_not_found", "route not found")
		return
	}
	writer.Header().Set("Cache-Control", noCache)
	http.ServeContent(writer, request, indexFileName, info.ModTime(), file)
}

func (h *spaHandler) writeCacheHeader(writer http.ResponseWriter, requestPath string) {
	if h.isImmutable(requestPath) {
		writer.Header().Set("Cache-Control", immutableLongTermCache)
		return
	}
	writer.Header().Set("Cache-Control", noCache)
}

func (h *spaHandler) writeFailure(writer http.ResponseWriter, request *http.Request, status int, code, message string) {
	httpx.WriteProblem(writer, request, &httpx.StatusError{StatusCode: status, Code: code, Message: message})
}

// isUnsafePath 拒绝反斜杠、NUL、未规范化路径与越界段。
func isUnsafePath(requestPath string) bool {
	trimmed := strings.TrimPrefix(requestPath, "/")
	if strings.ContainsRune(trimmed, 0) || strings.Contains(trimmed, "\\") {
		return true
	}
	normalized := path.Clean("/" + trimmed)
	if normalized != "/"+trimmed {
		return true
	}
	for _, segment := range strings.Split(trimmed, "/") {
		if segment == ".." {
			return true
		}
	}
	return false
}
