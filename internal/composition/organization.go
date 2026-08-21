package composition

import (
	"context"
	"fmt"

	iamservice "github.com/rin721/go-scaffold-template/internal/module/iam/service"
	organizationservice "github.com/rin721/go-scaffold-template/internal/module/organization/service"
)

// organizationAccountDirectoryAdapter 是 Organization 到 IAM 账号事实的唯一装配适配器。
type organizationAccountDirectoryAdapter struct{ iam *iamservice.Service }

func newOrganizationAccountDirectory(iam *iamservice.Service) (organizationservice.AccountDirectory, error) {
	if iam == nil {
		return nil, fmt.Errorf("organization account directory IAM service is nil")
	}
	return organizationAccountDirectoryAdapter{iam: iam}, nil
}

func (adapter organizationAccountDirectoryAdapter) RequireAssignableAccount(ctx context.Context, accountID string) error {
	return adapter.iam.RequireAssignableAccount(ctx, accountID)
}

var _ organizationservice.AccountDirectory = organizationAccountDirectoryAdapter{}
