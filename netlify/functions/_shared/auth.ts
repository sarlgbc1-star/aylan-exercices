const encoder = new TextEncoder();
function b64(bytes: Uint8Array){let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function sign(value:string){const secret=Netlify.env.get('PARENT_SESSION_SECRET');if(!secret)throw new Error('PARENT_SESSION_SECRET missing');const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return b64(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))))}
export async function createSession(){const expires=String(Date.now()+86400000);return expires+'.'+await sign(expires)}
export async function validSession(request:Request){try{const raw=request.headers.get('cookie')||'';const match=raw.match(/(?:^|;\s*)aylan_parent_session=([^;]+)/);if(!match)return false;const parts=match[1].split('.');if(parts.length!==2||Number(parts[0])<Date.now())return false;return parts[1]===await sign(parts[0])}catch{return false}}
export function sessionCookie(value:string){return `aylan_parent_session=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=86400`}
export const clearSessionCookie='aylan_parent_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
