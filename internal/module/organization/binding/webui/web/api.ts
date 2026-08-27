import { requestJSON } from "@webui/sdk/http";

export type Department={id:string;code:string;name:string;parentId?:string;active:boolean;archived:boolean;version:number;createdAt?:string;updatedAt?:string};
export type DepartmentNode=Department&{children:DepartmentNode[]};
export type Position={id:string;code:string;name:string;active:boolean;archived:boolean;version:number;createdAt?:string;updatedAt?:string};
export type Assignment={accountId:string;departmentId?:string;positionIds:string[];version:number};
export type Account={id:string;username:string;displayName:string};
type ListResult<T>={items:T[];offset:number;limit:number;total:number};




let csrfToken="";
const mutationHeaders=()=>({Origin:window.location.origin,"X-CSRF-Token":csrfToken});
const ensureCSRF=async()=>{if(!csrfToken){const session=await requestJSON<{csrfToken:string}>("/api/v1/iam/session");csrfToken=session.csrfToken;}};

export const listDepartments=(query?:string)=>requestJSON<ListResult<Department>>(`/api/v1/organization/departments?offset=0&limit=100${query?`&query=${encodeURIComponent(query)}`:""}`).then((value)=>value.items);
export const departmentTree=()=>requestJSON<DepartmentNode[]>("/api/v1/organization/departments/tree");
export const createDepartment=async(code:string,name:string,parentId?:string)=>{await ensureCSRF();return requestJSON<Department>("/api/v1/organization/departments",{method:"POST",headers:mutationHeaders(),body:JSON.stringify({code,name,parentId:parentId||undefined})});};
// DepartmentChanges mirrors the backend PATCH fields (optional): rename, reparent
// (clearParent clears the parent), active/archived toggle. version is the
// optimistic-lock field and is always sent.
export type DepartmentChanges={name?:string;parentId?:string;clearParent?:boolean;active?:boolean;archived?:boolean};
export type PositionChanges={name?:string;active?:boolean;archived?:boolean};
export const updateDepartment=async(value:Department,changes:DepartmentChanges)=>{await ensureCSRF();return requestJSON<Department>(`/api/v1/organization/departments/${value.id}`,{method:"PATCH",headers:mutationHeaders(),body:JSON.stringify({version:value.version,...changes})});};
export const listPositions=(query?:string)=>requestJSON<ListResult<Position>>(`/api/v1/organization/positions?offset=0&limit=100${query?`&query=${encodeURIComponent(query)}`:""}`).then((value)=>value.items);
export const createPosition=async(code:string,name:string)=>{await ensureCSRF();return requestJSON<Position>("/api/v1/organization/positions",{method:"POST",headers:mutationHeaders(),body:JSON.stringify({code,name})});};
export const updatePosition=async(value:Position,changes:PositionChanges)=>{await ensureCSRF();return requestJSON<Position>(`/api/v1/organization/positions/${value.id}`,{method:"PATCH",headers:mutationHeaders(),body:JSON.stringify({version:value.version,...changes})});};
export const listAccounts=()=>requestJSON<ListResult<Account>>("/api/v1/iam/accounts?offset=0&limit=100").then((value)=>value.items);
export const getAssignment=(accountId:string)=>requestJSON<Assignment>(`/api/v1/organization/accounts/${accountId}/assignment`);
export const replaceAssignment=async(accountId:string,expectedVersion:number,departmentId:string,positionIds:string[])=>{await ensureCSRF();return requestJSON<Assignment>(`/api/v1/organization/accounts/${accountId}/assignment`,{method:"PUT",headers:mutationHeaders(),body:JSON.stringify({expectedVersion,departmentId:departmentId||undefined,positionIds})});};