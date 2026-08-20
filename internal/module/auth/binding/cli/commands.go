// Package clibinding 绑定 Auth 管理命令。
package clibinding

import (
	"context"
	"fmt"

	kernelcli "github.com/rin721/go-scaffold-template/internal/kernel/cli"
	"github.com/rin721/go-scaffold-template/pkg/cli"
)

// Executor 承载命令执行所需的最小 Auth 管理能力。
type Executor interface {
	ResetPassword(context.Context, string, string) error
}

// Contract 提供 Auth 管理命令树，不在构造阶段创建数据库资源。
type Contract struct{ executor Executor }

// New 创建 Auth CLI command binding。
func New(executor Executor) (kernelcli.Contract, error) {
	if executor == nil {
		return nil, fmt.Errorf("auth CLI executor is nil")
	}
	return &Contract{executor: executor}, nil
}

// Commands 返回离线管理员维护命令。
func (c *Contract) Commands() ([]cli.CommandSpec, error) {
	return []cli.CommandSpec{{
		Name: "admin", Description: "管理本地管理员", Mode: cli.CommandModeApplication,
		SideEffect: cli.SideEffectExternalWrite, Positional: cli.PositionalNone,
		Commands: []cli.CommandSpec{c.resetPasswordCommand()},
	}}, nil
}

func (c *Contract) resetPasswordCommand() cli.CommandSpec {
	return cli.CommandSpec{
		Name: "reset-password", Description: "重置本地管理员密码", Mode: cli.CommandModeApplication,
		SideEffect: cli.SideEffectExternalWrite, Positional: cli.PositionalNone,
		Flags: []cli.FlagSpec{
			{Name: "username", Type: cli.FlagTypeString, Required: true, Description: "本地管理员用户名"},
			{Name: "password", Type: cli.FlagTypeString, Description: "新密码；未提供时通过安全输入提示读取"},
		},
		Run: func(ctx *cli.Context) error {
			password := ctx.GetString("password")
			if password == "" {
				if ctx.UI == nil {
					return &cli.UsageError{Command: ctx.CommandPath, Message: "password is required when interactive input is unavailable"}
				}
				var err error
				password, err = ctx.UI.Password(ctx.Context, "请输入新密码")
				if err != nil {
					return fmt.Errorf("read admin password: %w", err)
				}
			}
			if err := c.executor.ResetPassword(ctx.Context, ctx.GetString("username"), password); err != nil {
				return err
			}
			_, err := fmt.Fprintln(ctx.Stdout, "admin password reset")
			return err
		},
	}
}

var _ kernelcli.Contract = (*Contract)(nil)
