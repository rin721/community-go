// Package password 封装 Auth module 选定的 Argon2id password hashing 参数。
package password

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"fmt"
	"strings"

	"golang.org/x/crypto/argon2"
)

const (
	memory      = 19 * 1024
	iterations  = 2
	parallelism = 1
	keyLength   = 32
)

// Hash 生成 Argon2id PHC 字符串；salt 每次随机生成。
func Hash(value string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := argon2.IDKey([]byte(value), salt, iterations, memory, parallelism, keyLength)
	return fmt.Sprintf("$argon2id$v=19$m=%d,t=%d,p=%d$%s$%s", memory, iterations, parallelism, base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(key)), nil
}

// Compare 使用 PHC 参数进行固定成本比较。
func Compare(encoded, value string) bool {
	parts := strings.Split(encoded, "$")
	if len(parts) != 6 || parts[1] != "argon2id" {
		return false
	}
	var memoryValue, iterationsValue, parallelismValue int
	if _, err := fmt.Sscanf(parts[3], "m=%d,t=%d,p=%d", &memoryValue, &iterationsValue, &parallelismValue); err != nil {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(parts[4])
	if err != nil {
		return false
	}
	expected, err := base64.RawStdEncoding.DecodeString(parts[5])
	if err != nil {
		return false
	}
	actual := argon2.IDKey([]byte(value), salt, uint32(iterationsValue), uint32(memoryValue), uint8(parallelismValue), uint32(len(expected)))
	return len(actual) == len(expected) && subtle.ConstantTimeCompare(actual, expected) == 1
}
