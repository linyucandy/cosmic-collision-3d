"""Export public community records for same-origin fallback; never exports credentials."""
import argparse
import json
import os
from pathlib import Path
import re
from datetime import datetime, timezone
from urllib.request import Request, urlopen

REPO = os.environ.get('GITHUB_REPOSITORY','linyucandy/cosmic-collision-3d')
if not re.fullmatch(r'[\w.-]+/[\w.-]+',REPO):
    raise ValueError('Invalid repository')
BASE = 'https://api.github.com/repos/'+REPO


def request(path, method='GET'):
    headers = {'Accept':'application/vnd.github+json','User-Agent':'Cosmic-Community-Snapshot'}
    token = os.environ.get('GITHUB_TOKEN')
    if token:
        headers['Authorization'] = 'Bearer '+token
    with urlopen(Request(BASE+path,headers=headers,method=method,data=b'' if method=='POST' else None),timeout=30) as response:
        return json.load(response),response.headers.get('Link','')


def read_all(path):
    result = []
    for page in range(1,21):
        records,link = request(path+('&' if '?' in path else '?')+f'per_page=100&page={page}')
        if not isinstance(records,list):
            raise ValueError('Expected complete public records')
        result.extend(records)
        if 'rel="next"' not in link:
            return result
    raise ValueError('Refusing to export incomplete pagination')


def snapshot():
    issues,comments = [],{}
    for row in read_all('/issues?state=open&sort=created&direction=desc'):
        body = row.get('body') or ''
        if row.get('pull_request') or not re.search(r'<!-- cosmic-(game|review|discussion):v1 -->',body):
            continue
        item = {key:row[key] for key in ['number','state','body','created_at','updated_at','comments']}
        item['user'] = {'login':row['user']['login']}
        issues.append(item)
        if row['comments'] and re.search(r'<!-- cosmic-(review|discussion):v1 -->',body):
            comments[str(row['number'])] = [
                {'id':reply['id'],'body':reply.get('body') or '',
                 'created_at':reply['created_at'],'user':{'login':reply['user']['login']}}
                for reply in read_all(f"/issues/{row['number']}/comments")]
    return {'schema':1,'generated_at':datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'issues':issues,'comments':comments}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--request-pages-build',action='store_true')
    args = parser.parse_args()
    if args.request_pages_build:
        result,_ = request('/pages/builds',method='POST')
        print('Pages build:',result.get('status','requested'))
    else:
        data = snapshot()
        target = Path(__file__).resolve().parents[1]/'community-snapshot.json'
        temporary = target.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        temporary.replace(target)
        print('Exported',len(data['issues']),'public community records')
