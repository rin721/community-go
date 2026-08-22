// Package migration 绑定 IAM 独占的三驱动 versioned SQL。
package migration

import (
	"embed"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

const CurrentVersion uint = 2
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
		},
	}
}
