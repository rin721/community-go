import assert from 'node:assert/strict';

import {
  getFoundationWorkspaceNameViolation,
  isFoundationDependencyAllowed,
} from './foundation-policy.mjs';

const universal = { layer: 'universal' };
const admin = { layer: 'surface', surface: 'admin' };
const product = { layer: 'surface', surface: 'product' };
const adminWeb = { layer: 'host', surface: 'admin', runtime: 'web' };

assert.equal(isFoundationDependencyAllowed(universal, universal), true);
assert.equal(isFoundationDependencyAllowed(universal, admin), false);
assert.equal(isFoundationDependencyAllowed(admin, universal), true);
assert.equal(isFoundationDependencyAllowed(admin, product), false);
assert.equal(isFoundationDependencyAllowed(adminWeb, admin), true);
assert.equal(isFoundationDependencyAllowed(adminWeb, product), false);
assert.equal(getFoundationWorkspaceNameViolation('packages/admin-foundation', admin), null);
assert.equal(
  getFoundationWorkspaceNameViolation('packages/admin-patterns', admin),
  'Surface Foundation 命名必须为 packages/<surface>-foundation',
);
assert.equal(getFoundationWorkspaceNameViolation('apps/admin-web', adminWeb), null);
assert.equal(
  getFoundationWorkspaceNameViolation('apps/web', adminWeb),
  'Host 命名必须为 apps/<surface>-<runtime>',
);

console.log('Foundation fixtures passed: 10 cases.');
