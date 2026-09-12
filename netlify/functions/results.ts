import type { Config } from '@netlify/functions';
import { getStore } from '@netlify/blobs';
import { validSession } from './_shared/auth.js';
const store=getStore({name:'aylan-results',consistency:'strong'});
const clean=(v:unknown,max:number)=>typeof v==='string'?v.slice(0,max):'';
export default async(request:Request)=>{
 if(request.method==='POST'){
  const body=await request.json().catch(()=>null); if(!body||typeof body!=='object')return Response.json({ok:false,error:'Données invalides.'},{status:400});
  const d=body as Record<string,unknown>; const result={id:crypto.randomUUID(),createdAt:new Date().toISOString(),skill:clean(d.skill,50),subject:clean(d.subject,30),question:clean(d.question,300),answer:clean(d.answer,100),correctAnswer:clean(d.correctAnswer,100),correct:d.correct===true,difficulty:Math.max(1,Math.min(4,Number(d.difficulty)||1))};
  if(!result.skill||!result.question)return Response.json({ok:false,error:'Compétence ou question manquante.'},{status:400});
  await store.setJSON(`results/${result.createdAt}-${result.id}`,result); return Response.json({ok:true,id:result.id});
 }
 if(request.method==='GET'){
  if(!(await validSession(request)))return Response.json({error:'Non autorisé.'},{status:401});
  const results:any[]=[]; for await(const item of store.list({prefix:'results/'})){const value=await store.get(item.key,{type:'json'});if(value)results.push(value)}
  results.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))); return Response.json({results});
 }
 return new Response('Method Not Allowed',{status:405});
};
export const config:Config={path:'/api/results'};
