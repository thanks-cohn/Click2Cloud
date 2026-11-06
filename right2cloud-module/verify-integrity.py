"""Read-only tracked-byte verification; writes evidence only under this module."""
import hashlib,json,pathlib,subprocess,datetime
root=pathlib.Path(__file__).resolve().parent
report={'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'repositories':{}}
for repo in [root.parent,root.parent.parent/'REDOWN']:
    git=lambda *args:subprocess.check_output(['git','-C',str(repo),*args])
    records=[];mismatch=[];normalized=[]
    for entry in git('ls-tree','-rz','--full-tree','HEAD').split(b'\0'):
        if not entry:continue
        meta,raw=entry.split(b'\t',1);mode,kind,oid=meta.split();name=raw.decode()
        if kind!=b'blob':continue
        path=repo/name
        try:
            data=str(path.readlink()).encode() if mode==b'120000' else path.read_bytes()
            actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            if actual!=oid.decode():
                attrs=git('check-attr','text','eol','--',name).decode()
                expected=git('show','HEAD:'+name)
                if ': eol: crlf' in attrs and data.replace(b'\r\n',b'\n')==expected:normalized.append(name)
                else:mismatch.append(name)
            records.append([name,hashlib.sha256(data).hexdigest()])
        except OSError:mismatch.append(name)
    report['repositories'][repo.name]={'head':git('rev-parse','HEAD').decode().strip(),'branch':git('branch','--show-current').decode().strip(),'trackedFilesChecked':len(records),'aggregateSha256':hashlib.sha256(json.dumps(records).encode()).hexdigest(),'mismatchedOrMissingTrackedFiles':mismatch,'declaredCrlfCheckoutNormalization':normalized,'status':git('status','--porcelain','--untracked-files=all').decode(),'trackedDiff':git('diff','HEAD','--stat').decode()}
(root/'INTEGRITY.json').write_text(json.dumps(report,indent=2)+'\n')
assert all(not r['mismatchedOrMissingTrackedFiles'] and not r['trackedDiff'] for r in report['repositories'].values())
assert not report['repositories']['REDOWN']['status']
assert all(line[3:].startswith('right2cloud-module/') for line in report['repositories']['Click2Cloud']['status'].splitlines())
print('PASS: tracked bytes match HEAD in both repositories; untracked changes are module-only')
