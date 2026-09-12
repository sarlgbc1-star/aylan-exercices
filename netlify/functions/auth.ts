import type { Config } from '@netlify/functions';
import { clearSessionCookie, createSession, sessionCookie, validSession } from './_shared/auth.js';
export default async (request:Request)=>{
  if(request.method==='GET')return Response.json({authenticated:await validSession(request)});
  if(request.method==='DELETE')return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':clearSessionCookie}});
  if(request.method!=='POST')return new Response('Method Not Allowed',{status:405});
  const body=await request.json().catch(()=>({}));
  const password=typeof body.password==='string'?body.password:'';
  const expected=Netlify.env.get('PARENT_PASSWORD');
  if(!expected)return Response.json({ok:false,error:'Parent password is not configured.'},{status:503});
  if(password!==expected)return Response.json({ok:false,error:'Mot de passe incorrect.'},{status:401});
  const token=await createSession();
  return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json','Set-Cookie':sessionCookie(token)}});
};
export const config:Config={path:'/api/login'};
