const safeName=account=>/^[\da-f]{32}$/i.test(account?.name??'')?'':account?.name?.trim()??'';

export function accountLabel(account,accounts=[]){
 const name=safeName(account);
 const index=accounts.findIndex(item=>item.id===account?.id);
 if(index<0)return name||'Cloudflare account';
 return name&&accounts.filter(item=>safeName(item)===name).length===1?name:
  (name||'Cloudflare account')+' ('+(index+1)+')';
}

export const destinationPath=target=>target?target.bucketName+'/'+(target.prefix??''):'';
