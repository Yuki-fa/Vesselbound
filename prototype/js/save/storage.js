// 保存媒体へのアクセスはここだけ。settingsとはキーも寿命も共有しない。
const SaveStorage=(()=>{
  let adapter=null;
  const media=()=>adapter||globalThis.localStorage;
  const key=(kind,generation)=>`vesselbound.${kind}.${generation}`;
  function read(kind,validate){
    let failure=null;
    for(const generation of ['current','backup']){
      try{
        const raw=media().getItem(key(kind,generation));
        if(raw==null) continue;
        const data=validate(JSON.parse(raw));
        if(generation==='backup') console.warn(`[save:${kind}] backupから復旧しました`,failure);
        return {data,generation};
      }catch(error){
        console.error(`[save:${kind}:${generation}] 読み込み失敗`,error);
        // 未来版は破損ではない。古いbackupへ巻き戻して上書きしない。
        if(error.code==='SAVE_FUTURE') throw error;
        failure=error;
      }
    }
    if(failure) throw failure;
    return null;
  }
  function write(kind,data,validate){
    // stringifyより先に非有限数・循環参照等を検証する。
    validate(data);
    const raw=JSON.stringify(data);
    validate(JSON.parse(raw));
    let old=null;
    try{ old=read(kind,validate); }
    catch(error){ if(error.code==='SAVE_FUTURE') throw error; }
    if(old&&old.generation==='current') media().setItem(key(kind,'backup'),JSON.stringify(old.data));
    // localStorageのsetItemは1キー単位で置換する。旧currentを先に消さない。
    media().setItem(key(kind,'current'),raw);
    return data;
  }
  function remove(kind){
    // backupの削除失敗時にはcurrentを残す。
    media().removeItem(key(kind,'backup'));
    media().removeItem(key(kind,'current'));
  }
  return {read,write,remove,key,setAdapter(value){adapter=value;}};
})();
