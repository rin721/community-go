import { describe, expect, it } from 'vitest';

import { referenceFormSchema } from './reference-form';

describe('referenceFormSchema', () => {
  it('保留复杂表单的字段级错误语义', () => {
    const result = referenceFormSchema.safeParse({
      name: 'x',
      owner: '',
      region: 'apac',
      mode: 'observe',
      description: 'too short',
      reviewDate: '',
      notifyReviewers: true,
      allowOfflineDraft: false,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      expect(fieldErrors.name?.length).toBeGreaterThan(0);
      expect(fieldErrors.owner?.length).toBeGreaterThan(0);
      expect(fieldErrors.description?.length).toBeGreaterThan(0);
      expect(fieldErrors.reviewDate?.length).toBeGreaterThan(0);
    }
  });
});
