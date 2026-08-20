package auth

// Principal 表示通过认证后的调用主体。
//
// OrgID 和 SessionID 共同限定当前请求的租户上下文与会话边界。
type Principal struct {
	UserID      int64  `json:"userId,string"`
	OrgID       int64  `json:"orgId,string"`
	SessionID   int64  `json:"sessionId,string"`
	ProductCode string `json:"productCode"`
	ClientType  string `json:"clientType"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
	RoleCode    string `json:"roleCode,omitempty"`
}

// PermissionContext 描述一次权限判断所需的最小平台上下文。
type PermissionContext struct {
	ProductCode string
	Scope       string
	Object      string
	Action      string
}
