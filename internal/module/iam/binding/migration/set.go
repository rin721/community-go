// Package migration 绑定 IAM 独占的三驱动 versioned SQL。
package migration

import (
	"embed"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

const CurrentVersion uint = 1
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
		},
	}
}
