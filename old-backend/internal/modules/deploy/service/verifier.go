package service

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
)

// ErrSignatureInvalid 表示 Webhook 签名校验失败。
var ErrSignatureInvalid = errors.New("webhook signature invalid")

// ErrSignatureMissing 表示请求中缺少签名头。
var ErrSignatureMissing = errors.New("webhook signature header missing")

// SignatureVerifier 是签名校验器接口；不同 Git 提供商实现各自的校验逻辑。
type SignatureVerifier interface {
	// Verify 校验原始请求体与请求头中的签名是否匹配。
	// 返回 ErrSignatureInvalid / ErrSignatureMissing 或 nil。
	Verify(body []byte, headers map[string]string) error
}

// NewVerifier 根据 provider 字符串返回对应的签名校验器。
func NewVerifier(provider, secret string, requireSecret bool) (SignatureVerifier, error) {
	switch strings.ToLower(strings.TrimSpace(provider)) {
	case "github":
		return &githubVerifier{secret: secret, requireSecret: requireSecret}, nil
	case "gitlab":
		return &gitlabVerifier{secret: secret, requireSecret: requireSecret}, nil
	case "generic":
		return &genericVerifier{secret: secret, requireSecret: requireSecret}, nil
	default:
		return nil, fmt.Errorf("unsupported webhook provider: %q", provider)
	}
}

// ─── GitHub verifier ─────────────────────────────────────────────────────────
// GitHub 使用 HMAC-SHA256 签名，格式为 sha256=<hex>，放在 X-Hub-Signature-256 头。

type githubVerifier struct {
	secret        string
	requireSecret bool
}

func (v *githubVerifier) Verify(body []byte, headers map[string]string) error {
	sigHeader := headers["x-hub-signature-256"]
	if sigHeader == "" {
		// 兼容原始大小写
		for k, val := range headers {
			if strings.EqualFold(k, "x-hub-signature-256") {
				sigHeader = val
				break
			}
		}
	}
	if sigHeader == "" {
		if !v.requireSecret {
			return nil
		}
		return ErrSignatureMissing
	}
	if !strings.HasPrefix(sigHeader, "sha256=") {
		return ErrSignatureInvalid
	}
	provided := strings.TrimPrefix(sigHeader, "sha256=")
	expected := computeHMACSHA256(body, v.secret)
	if !hmac.Equal([]byte(provided), []byte(expected)) {
		return ErrSignatureInvalid
	}
	return nil
}

// ─── GitLab verifier ──────────────────────────────────────────────────────────
// GitLab 在 X-Gitlab-Token 头中直接发送纯文本密钥，进行常量时间对比。

type gitlabVerifier struct {
	secret        string
	requireSecret bool
}

func (v *gitlabVerifier) Verify(body []byte, headers map[string]string) error {
	token := ""
	for k, val := range headers {
		if strings.EqualFold(k, "x-gitlab-token") {
			token = val
			break
		}
	}
	if token == "" {
		if !v.requireSecret {
			return nil
		}
		return ErrSignatureMissing
	}
	// 使用 hmac.Equal 避免时序攻击
	if !hmac.Equal([]byte(token), []byte(v.secret)) {
		return ErrSignatureInvalid
	}
	return nil
}

// ─── Generic verifier ────────────────────────────────────────────────────────
// 通用模式：在 X-Webhook-Signature 中发送 HMAC-SHA256(body, secret)。

type genericVerifier struct {
	secret        string
	requireSecret bool
}

func (v *genericVerifier) Verify(body []byte, headers map[string]string) error {
	sigHeader := ""
	for k, val := range headers {
		if strings.EqualFold(k, "x-webhook-signature") {
			sigHeader = val
			break
		}
	}
	if sigHeader == "" {
		if !v.requireSecret {
			return nil
		}
		return ErrSignatureMissing
	}
	expected := computeHMACSHA256(body, v.secret)
	if !hmac.Equal([]byte(sigHeader), []byte(expected)) {
		return ErrSignatureInvalid
	}
	return nil
}

// computeHMACSHA256 计算 body 的 HMAC-SHA256 十六进制字符串。
func computeHMACSHA256(body []byte, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return hex.EncodeToString(mac.Sum(nil))
}
