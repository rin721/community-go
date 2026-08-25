import { requestJSON } from "@webui/sdk/http";

export type Department={id:string;code:string;name:string;parentId?:string;active:boolean;archived:boolean;version:number};
export type DepartmentNode=Department&{children:DepartmentNode[]};
export type Position={id:string;code:string;name:string;active:boolean;archived:boolean;version:number};
export type Assignment={accountId:string;departmentId?:string;positionIds:string[];version:number};
export type Account={id:string;username:string;displayName:string};
type ListResult<T>={items:T[];offset:number;limit:number;total:number};

// 076：org operation 迁移 webuiSession 认证后，mutation 请求必须携带
// Origin + X-CSRF-Token（复用 IAM Session 的 CSRF 语义）；token 从当前
// IAM Session（刷新 CSRF）获取，与 iam 模块页面 remember 模式一致。
let csrfToken="";
const mutationHeaders=()=>({Origin:window.location.origin,"X-CSRF-Token":csrfToken});
const ensureCSRF=async()=>{if(!csrfToken){const session=await requestJSON<{csrfToken:string}>("/api/v1/iam/session");csrfToken=session.csrfToken;}};

export const listDepartments=(query?:string)=>requestJSON<ListResult<Department>>(`/api/v1/organization/departments?offset=0&limit=100${query?`&query=${encodeURIComponent(query)}`:""}`).then((value)=>value.items);
export const departmentTree=()=>requestJSON<DepartmentNode[]>("/api/v1/organization/departments/tree");
export const createDepartment=async(code:string,name:string,parentId?:string)=>{await ensureCSRF();return requestJSON<Department>("/api/v1/organization/departments",{method:"POST",headers:mutationHeaders(),body:JSON.stringify({code,name,parentId:parentId||undefined})});};
export const updateDepartment=async(value:Department,changes:Record<string,unknown>)=>{await ensureCSRF();return requestJSON<Department>(`/api/v1/organization/departments/${value.id}`,{method:"PATCH",headers:mutationHeaders(),body:JSON.stringify({version:value.version,...changes})});};
export const listPositions=(query?:string)=>requestJSON<ListResult<Position>>(`/api/v1/organization/positions?offset=0&limit=100${query?`&query=${encodeURIComponent(query)}`:""}`).then((value)=>value.items);
export const createPosition=async(code:string,name:string)=>{await ensureCSRF();return requestJSON<Position>("/api/v1/organization/positions",{method:"POST",headers:mutationHeaders(),body:JSON.stringify({code,name})});};
export const updatePosition=async(value:Position,changes:Record<string,unknown>)=>{await ensureCSRF();return requestJSON<Position>(`/api/v1/organization/positions/${value.id}`,{method:"PATCH",headers:mutationHeaders(),body:JSON.stringify({version:value.version,...changes})});};
export const listAccounts=()=>requestJSON<ListResult<Account>>("/api/v1/iam/accounts?offset=0&limit=100").then((value)=>value.items);
export const getAssignment=(accountId:string)=>requestJSON<Assignment>(`/api/v1/organization/accounts/${accountId}/assignment`);
export const replaceAssignment=async(accountId:string,expectedVersion:number,departmentId:string,positionIds:string[])=>{await ensureCSRF();return requestJSON<Assignment>(`/api/v1/organization/accounts/${accountId}/assignment`,{method:"PUT",headers:mutationHeaders(),body:JSON.stringify({expectedVersion,departmentId:departmentId||undefined,positionIds})});};