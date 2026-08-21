// Package password 封装 IAM 本地凭据使用的 Argon2id。
package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

const memory uint32 = 64 * 1024
const iterations uint32 = 3
const parallelism uint8 = 2
const saltLength = 16
const keyLength uint32 = 32

// Hasher 是 IAM Service 使用的项目内密码能力适配器。
type Hasher struct{}

func (Hasher) Hash(value string) (string, error)  { return Hash(value) }
func (Hasher) Compare(encoded, value string) bool { return Compare(encoded, value) }
func Hash(value string) (string, error) {
	salt := make([]byte, saltLength)
	if _, err := rand.Read(salt); err != nil {
		return "", fmt.Errorf("generate password salt: %w", err)
	}
	digest := argon2.IDKey([]byte(value), salt, iterations, memory, parallelism, keyLength)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", memory, iterations, parallelism, base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(digest)), nil
}
func Compare(encoded, value string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil || len(expected) != int(keyLength) {
		return false
	}
	actual := argon2.IDKey([]byte(value), salt, iterations, memory, parallelism, keyLength)
	return subtle.ConstantTimeCompare(actual, expected) == 1
}
