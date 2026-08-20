package password

import "testing"

func TestHashUsesArgon2idAndRoundTrips(t *testing.T) {
	encoded, err := Hash("a password with enough length")
	if err != nil { t.Fatal(err) }
	if len(encoded) < 40 || encoded[:9] != "$argon2id" { t.Fatalf("hash format = %q", encoded) }
	if !Compare(encoded, "a password with enough length") { t.Fatal("matching password was rejected") }
	if Compare(encoded, "a different password with enough length") { t.Fatal("different password was accepted") }
}
