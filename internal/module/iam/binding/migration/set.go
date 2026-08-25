// Package migration 绑定 IAM 独占的三驱动 versioned SQL。
package migration

import (
	"embed"
	"github.com/rin721/go-scaffold-template/pkg/database"
	dbmigrate "github.com/rin721/go-scaffold-template/pkg/database/migrate"
)

const CurrentVersion uint = 8
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
			"sqlite/000005_add_iam_password_security.up.sql": "fd9ef41bea060dcbbdcb2ebeeef77ba799df02d3c698928190ea1ac1612f19ce", "sqlite/000005_add_iam_password_security.down.sql": "1960b3e0a0d32671a8727791bae1fe78fa6cf4c174eadbc0ee81b90f9893242e",
			"postgres/000005_add_iam_password_security.up.sql": "cc76e730d6722de72b536f22d03a9b09cdc9a0b40f16f4de561958891217fd4b", "postgres/000005_add_iam_password_security.down.sql": "1960b3e0a0d32671a8727791bae1fe78fa6cf4c174eadbc0ee81b90f9893242e",
			"mysql/000005_add_iam_password_security.up.sql": "c2b4ca5c469edaa1e7547b884fd35f28502210126646e811df272cd711cbd0a9", "mysql/000005_add_iam_password_security.down.sql": "1960b3e0a0d32671a8727791bae1fe78fa6cf4c174eadbc0ee81b90f9893242e",
			"sqlite/000006_create_iam_api_tokens.up.sql": "e85717309c803138024f512e2a53a76cf2ed3918b3aa9acb95d3fd40062809fb", "sqlite/000006_create_iam_api_tokens.down.sql": "e188aa8a58d528be75a446ed82c46307f58e56097c31887430d1f7e361e2e5c5",
			"postgres/000006_create_iam_api_tokens.up.sql": "36f3f581bdc621aadf15fe7b88483609f9fa0cd61bc26b958259df2b9700daf2", "postgres/000006_create_iam_api_tokens.down.sql": "e188aa8a58d528be75a446ed82c46307f58e56097c31887430d1f7e361e2e5c5",
			"mysql/000006_create_iam_api_tokens.up.sql": "2801938d709ac3d3339fe00f04c62ef01c33728bab856ca2a14479a7f76f8dda", "mysql/000006_create_iam_api_tokens.down.sql": "e188aa8a58d528be75a446ed82c46307f58e56097c31887430d1f7e361e2e5c5",
			"sqlite/000007_create_iam_mfa.up.sql": "53d1c32b160b754191998878b945992b240abdb7d3893b1c399c1839dd7ce70f", "sqlite/000007_create_iam_mfa.down.sql": "5a800d569b65ae52d144798902d1f1907e976bc4337d4d718359f7694df0db6f",
			"postgres/000007_create_iam_mfa.up.sql": "77f2926da2a8f1cb401ec8404dc6670b60ab6d90d2d8e936198f9f165a13138b", "postgres/000007_create_iam_mfa.down.sql": "5a800d569b65ae52d144798902d1f1907e976bc4337d4d718359f7694df0db6f",
			"mysql/000007_create_iam_mfa.up.sql": "970a457af0b92a9d7ada51dc7c80d2bd996fbd930e60b8d0f1f2d4d1bd9cffbd", "mysql/000007_create_iam_mfa.down.sql": "5a800d569b65ae52d144798902d1f1907e976bc4337d4d718359f7694df0db6f",
			"sqlite/000008_extend_iam_api_tokens.up.sql": "7b6597f756558e2a3414718fe57f02ed8d596934639f59bf681a40e4e4f17123", "sqlite/000008_extend_iam_api_tokens.down.sql": "aacb2c6d44e338eebf2f865ab743626127d7aa5d047d389be3144cb05daabda7",
			"postgres/000008_extend_iam_api_tokens.up.sql": "35fde3ba1f265ad6dcc146f69b3f0553e06a68a075496527e469cb3f8f7606e0", "postgres/000008_extend_iam_api_tokens.down.sql": "aacb2c6d44e338eebf2f865ab743626127d7aa5d047d389be3144cb05daabda7",
			"mysql/000008_extend_iam_api_tokens.up.sql": "5206bdfc401486a200693d4d1a3443e602e58a14a0bb7273a8a27d43bbb76249", "mysql/000008_extend_iam_api_tokens.down.sql": "aacb2c6d44e338eebf2f865ab743626127d7aa5d047d389be3144cb05daabda7",
		},
	}
}
