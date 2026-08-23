// Package migration 绑定 IAM 独占的三驱动 versioned SQL。
package migration

import (
	"embed"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

const CurrentVersion uint = 4
const TableName = "iam_schema_migrations"

//go:embed sqlite/*.sql postgres/*.sql mysql/*.sql
var sqlFiles embed.FS

func Set() dbmigrate.Set {
	return dbmigrate.Set{
		Name: "iam", FS: sqlFiles, CurrentVersion: CurrentVersion, MigrationsTable: TableName,
		DriverPaths: map[database.Driver]string{database.DriverSQLite: "sqlite", database.DriverPostgres: "postgres", database.DriverMySQL: "mysql"},
		SHA256ByFile: map[string]string{
			"sqlite/000001_create_iam.up.sql": "454f2519f2aabb73f2b36c077fd786952d97620ae81ccc60f5d52ce52bedb96e", "sqlite/000001_create_iam.down.sql": "7af9bf683d0c36cfae43a6d95aacc35572e23c59b6f2ee1b0016acb3e1d7a65a",
			"postgres/000001_create_iam.up.sql": "9c131461f86765061ab635be3b2a6b2d21d3f289109c1f3ba994b954f8513535", "postgres/000001_create_iam.down.sql": "0668f6dbce1b0edd4421de9896344f69b1b9a32fb53195c3f2c37ba08a9120f3",
			"mysql/000001_create_iam.up.sql": "2e808c5b043e6a15a6423b404363ce6702bf1bfa5c52806f6b3c709addc0ee80", "mysql/000001_create_iam.down.sql": "0668f6dbce1b0edd4421de9896344f69b1b9a32fb53195c3f2c37ba08a9120f3",
			"sqlite/000002_create_iam_authorization_state.up.sql": "33a3b11544919df138cd6c81909770b0aeeff3c3cfc9f583b4bcc1c3f725a78a", "sqlite/000002_create_iam_authorization_state.down.sql": "83ab2e5bb5bacc2cabce30f6d35cc6c4f5bc6c82c74b488ff99bf271950a90f9",
			"postgres/000002_create_iam_authorization_state.up.sql": "17f05f90235f048c1aa7fb8b8351e556ca538023ae2e3a1d4849fcc08c85b9d4", "postgres/000002_create_iam_authorization_state.down.sql": "83ab2e5bb5bacc2cabce30f6d35cc6c4f5bc6c82c74b488ff99bf271950a90f9",
			"mysql/000002_create_iam_authorization_state.up.sql": "af913ebc5b89e051a5075f76c9161511d3bdd01fa5e8a118edb976a4760b769f", "mysql/000002_create_iam_authorization_state.down.sql": "83ab2e5bb5bacc2cabce30f6d35cc6c4f5bc6c82c74b488ff99bf271950a90f9",
			"sqlite/000003_create_iam_account_archived.up.sql": "24260ec82991f3eb3d6d94a77aee10087558c2a0be7a5bfc852a3f302d427286", "sqlite/000003_create_iam_account_archived.down.sql": "c4e2eb5fb56fbcbc92bc004a0b4f1292e96f1009d0973aeeeeb0083998681106",
			"postgres/000003_create_iam_account_archived.up.sql": "54d6028cec58afd08d767f134a9c7b92796f84c5ff44a0fdfca86c53bb2b3a1a", "postgres/000003_create_iam_account_archived.down.sql": "c4e2eb5fb56fbcbc92bc004a0b4f1292e96f1009d0973aeeeeb0083998681106",
			"mysql/000003_create_iam_account_archived.up.sql": "54d6028cec58afd08d767f134a9c7b92796f84c5ff44a0fdfca86c53bb2b3a1a", "mysql/000003_create_iam_account_archived.down.sql": "c4e2eb5fb56fbcbc92bc004a0b4f1292e96f1009d0973aeeeeb0083998681106",
			"sqlite/000004_add_iam_account_profile.up.sql": "b5a62f2f3fceb5c2455b75602e09db5d0669e138e41af418f3c3ef3f94ead400", "sqlite/000004_add_iam_account_profile.down.sql": "09f30b717b938bef170096e599d0fc048864c94392e5da89f44ca29b2f1f1801",
			"postgres/000004_add_iam_account_profile.up.sql": "b5a62f2f3fceb5c2455b75602e09db5d0669e138e41af418f3c3ef3f94ead400", "postgres/000004_add_iam_account_profile.down.sql": "09f30b717b938bef170096e599d0fc048864c94392e5da89f44ca29b2f1f1801",
			"mysql/000004_add_iam_account_profile.up.sql": "02d7b9e9bdbd88319609a6441eb7b92ebba54d9643050e07e58cb45d0f4790ee", "mysql/000004_add_iam_account_profile.down.sql": "09f30b717b938bef170096e599d0fc048864c94392e5da89f44ca29b2f1f1801",
		},
	}
}
