const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('../community-github-data.js');
const issue = (number,login,body) => ({number,state:'open',body,user:{login},created_at:'2026-10-29T01:00:00Z',updated_at:`2026-10-29T02:00:${String(number).padStart(2,'0')}Z`,comments:0,html_url:`https://github.com/linyucandy/cosmic-collision-3d/issues/${number}`});
test('publication keeps verified GitHub author and rejects unsafe game URLs', () => {
  const body = model.makeBody('game',{title:'星际迷宫',description:'一个可以让玩家探索迷宫并发现新星球的网页游戏。',category:'puzzle',play_url:'https://example.com/game',author_name:'冒名作者'});
  const data = model.build([issue(3,'real-author',body)]);
  assert.equal(data.games.find(g=>g.id==='gh-3').author_name,'real-author');
  const bad = model.makeBody('game',{title:'恶意游戏',description:'一个包含恶意游戏网址的无效发布，应当被模型拒绝。',category:'puzzle',play_url:'javascript:alert(1)'});
  assert.equal(model.build([issue(4,'attacker',bad)]).games.length,7);
});
test('latest review per GitHub account counts once; author scores are excluded', () => {
  const records = [issue(3,'author',model.makeBody('game',{title:'星际迷宫',description:'一个可以让玩家探索迷宫并发现新星球的网页游戏。',category:'puzzle',play_url:'https://example.com/game'}))];
  records.push(issue(4,'player',model.makeBody('review',{game_id:'gh-3',rating:5,body:'第一版的评价'})));
  records.push(issue(5,'player',model.makeBody('review',{game_id:'gh-3',rating:3,body:'更新后的评价'})));
  records.push(issue(6,'author',model.makeBody('review',{game_id:'gh-3',rating:5,body:'作者不能给自己的游戏打分'})));
  records.push(issue(7,'other-player',model.makeBody('review',{game_id:'gh-3',rating:1,body:'还有改进空间'})));
  const data=model.build(records),game=data.games.find(g=>g.id==='gh-3');
  assert.equal(game.rating_count,2); assert.equal(game.rating_average,2);
  assert.equal(data.reviews.filter(r=>r.game_id==='gh-3'&&r.username==='player').length,1);
});
test('closed publications, pull requests and malformed metadata never become games', () => {
  const body=model.makeBody('game',{title:'不应发布',description:'这是一个关闭的作品，不应该出现在公开的游戏广场中。',category:'puzzle',play_url:'https://example.com/game'});
  assert.equal(model.build([{...issue(3,'author',body),state:'closed'},{...issue(4,'author',body),pull_request:{}},issue(5,'author','invalid')]).games.length,7);
});
test('issue drafts round-trip unicode without pretending to publish', () => {
  const data={game_id:'1',rating:4,body:'很好玩 <script>文字</script>'};
  const link=new URL(model.issueDraft('review',data,'宇宙碰撞'));
  assert.equal(link.origin,'https://github.com');
  assert.equal(link.pathname,'/linyucandy/cosmic-collision-3d/issues/new');
  assert.deepEqual(model.parseBody(link.searchParams.get('body')).data,data);
});
test('comments on an older duplicate cannot replace a newer vote', () => {
  const old=issue(4,'player',model.makeBody('review',{game_id:'1',rating:5,body:'较早发布的评分'}));
  old.updated_at='2026-10-30T00:00:00Z';
  const newer=issue(5,'player',model.makeBody('review',{game_id:'1',rating:2,body:'最新发布的评分'}));
  const data=model.build([old,newer]);
  assert.equal(data.games.find(game=>game.id==='1').rating_average,2);
});
test('code fences inside player text round-trip without losing the record', () => {
  const data={game_id:'1',rating:4,body:'这里可以使用 ```js\nplay()\n``` 代码示例。'};
  assert.deepEqual(model.parseBody(model.makeBody('review',data)).data,data);
});
test('uniSimBox has a playable public URL and accepts game-specific ratings', () => {
  const data=model.build([issue(9,'new-player',model.makeBody('review',{game_id:'unisimbox',rating:4,body:'实验很丰富，期待更多内容。'}))]);
  const game=data.games.find(game=>game.id==='unisimbox');
  assert.equal(game.play_url,'https://linyucandy.github.io/uniSimBox/');
  assert.equal(game.source_url,'https://github.com/linyucandy/uniSimBox');
  assert.equal(game.rating_average,4);
  assert.equal(game.rating_count,1);
});
test('pixel city is playable and has its own community rating', () => {
  const data=model.build([issue(10,'city-player',model.makeBody('review',{game_id:'pixel-city',rating:5,body:'喜欢慢慢建设城市。'}))]);
  const game=data.games.find(game=>game.id==='pixel-city');
  assert.equal(game.play_url,'pixel-city.html');assert.equal(game.author_name,'晨晨');
  assert.equal(game.rating_count,1);assert.equal(game.rating_average,5);
});
test('cosmic laboratory is separately published with its own rating', () => {
  const data=model.build([issue(11,'lab-player',model.makeBody('review',{game_id:'cosmic-lab',rating:4,body:'喜欢三种碰撞模式。'}))]);
  const game=data.games.find(game=>game.id==='cosmic-lab');
  assert.equal(game.play_url,'宇宙实验室_3D碰撞模拟器.html');assert.equal(game.rating_count,1);assert.equal(game.rating_average,4);
});
test('new canvas games have independent launch URLs and ratings',()=>{
  const data=model.build([issue(12,'fish-player',model.makeBody('review',{game_id:'pixel-fishing',rating:5,body:'手机也能顺利收线。'}))]);
  assert.equal(data.games.find(g=>g.id==='cosmos-collision').play_url,'cosmos_collision_lab.html');
  assert.equal(data.games.find(g=>g.id==='pixel-fishing').play_url,'pickFish.html');
  assert.equal(data.games.find(g=>g.id==='pixel-fishing').rating_average,5);
  assert.equal(data.games.find(g=>g.id==='cosmos-collision').rating_count,0);
});
