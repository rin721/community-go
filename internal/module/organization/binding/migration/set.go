// Package migration 绑定 Organization 独占的三驱动 versioned SQL。
package migration

import (
	"embed"

	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

const CurrentVersion uint = 1
const TableName = "organization_schema_migrations"

//go:embed sqlite/*.sql postgres/*.sql mysql/*.sql
var sqlFiles embed.FS

func Set() dbmigrate.Set {
	return dbmigrate.Set{Name: "organization", FS: sqlFiles, CurrentVersion: CurrentVersion, MigrationsTable: TableName,
		DriverPaths: map[database.Driver]string{database.DriverSQLite: "sqlite", database.DriverPostgres: "postgres", database.DriverMySQL: "mysql"},
		SHA256ByFile: map[string]string{
			"sqlite/000001_create_organization.up.sql": "b692ff1332529a57cdbe9ece75eabec748cfffa15ca7d8ddd7cd7c0d3f092269", "sqlite/000001_create_organization.down.sql": "e2541af3dcedb5111b51a5ae53da59a0f713243f82adbf22b7ad373616a774e3",
			"postgres/000001_create_organization.up.sql": "03f4bd581cbfc13e262be3c427255998ac836ec9225e1b35bc63b7acfe4231e8", "postgres/000001_create_organization.down.sql": "948d0c4285befe87680fa75cbe569e77d7fc8e5901e5885d127e7c8676c5fffa",
			"mysql/000001_create_organization.up.sql": "d3662fcebc4989273fd4459508e25e10e6909954f6ddea1d67c1d723c8e684c5", "mysql/000001_create_organization.down.sql": "948d0c4285befe87680fa75cbe569e77d7fc8e5901e5885d127e7c8676c5fffa",
		}}
}
