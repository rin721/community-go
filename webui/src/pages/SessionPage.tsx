import type { WebUISession } from "../api";
export function SessionPage({ session }: { session?: WebUISession }) { return <section className="page-card"><h1>当前会话</h1>{session ? <dl><dt>用户</dt><dd>{session.user.username}</dd><dt>空闲有效期</dt><dd>{session.idleExpiresAt}</dd><dt>绝对有效期</dt><dd>{session.absoluteExpiresAt}</dd></dl> : <p>未登录。请先登录后再访问会话详情。</p>}</section>; }
