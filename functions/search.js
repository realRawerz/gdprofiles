let fetch = require('node-fetch');
let cheerio = require('cheerio');
let getDiff = require('./getDifficultyByImg');

function last(array) {
  return array[array.length - 1];
}

/**
 * Getting user's information from gdprofiles.com
 * @async
 * @param {string} user - user's nickname
 * @return {Object}
 */

async function searchUser(user) {
  if (!user) {
    let error = new TypeError('user is required');
    throw error;
  } else if (typeof user !== 'string') {
    let error = new TypeError(`typeof user should be string, got ${typeof user}`);
    throw error;
  }

  let result = await (await fetch(`https://gdprofiles.com/${user.replace(/\s/g, '-')}`)).text();
  let $ = cheerio.load(result);
  let statsHtml = $('.staricon tbody tr').eq(1).html();
  if (!statsHtml) return null;
  let [
    explosion,
    player,
    ship,
    ball,
    bird,
    dart,
    robot,
    spider,
  ] = $('#playericons img').get().map(elem => $(elem).attr('src'));
  let isInTop = !!$('.rank').toString();
  let mod = {
    is: !!$('.mod_badge img').toString(),
  };
  mod.level = mod.is ? +$('.mod_badge img').attr('alt').replace(/mod\s/, '') : 0;
  mod.right = mod.is ? (mod.level === 1 ? 'Moderator' : 'Elder Moderator') : '';
  let stats = $(statsHtml).get().map(elem => +$(elem).text());
  let desc = $('p.well').text() || null;
  let created = $('.list-unstyled:nth-child(6) > li:nth-child(3) > em:nth-child(1)').text().match(/gd account created on (.*)/i) || null;
  let badges = $('.col-sm-9 .well.well-sm').eq(2).find('a').get()
    .map(elem => $(elem).attr('title'));
  let location = $('.list-unstyled:nth-child(6) > li:nth-child(4)').text().trim().replace(/\n/, '') || null;
  let video = $('.embed-responsive iframe').attr('src') ? $('.embed-responsive iframe').attr('src').match(/\/\/(.*)\?wmode=transparent/) : null;
  if (badges[0] === undefined) badges = null;
  let links = {};
  let linksTest = /href="(https?:\/\/)?(www\.)?(youtube|twitter|twitch|facebook|(plus\.)google|.*\.newgrounds|steamcommunity)\.(com|tv).*"/i;
  let followers = +$('#count_follow').text().match(/([0-9]+)\sfollowers?/i)[1];
  let linksHtml = $('.list-unstyled a').get().map(elem => String($(elem))).filter(elem => linksTest.test(elem))
    .slice(0, -1);
  linksHtml.forEach((link) => {
    let url = $(link).attr('href');
    let text = $(link).text();
    let type = text.match(/.*?\s(.+?)\s.*?/i)[1];
    links[type.toLowerCase()] = url;
  });
  let lastLevels = $('.well:nth-child(6) > ul:nth-child(1) li').get().map((elem) => {
    let level = $(elem).find('table tbody tr');
    let img = level.find('td img.leveldifficon').attr('src');
    let { diff, featured, epic } = getDiff(img);
    let data = level.find('td').eq(1);
    let coins = data.find('span .levelCoins').attr('src');
    let dailyInfo = data.find('span').eq(1).find('img');
    let wasDaily = !!dailyInfo.toString();
    let weeklyInfo = data.find('span').eq(2).find('img');
    let wasWeekly = !!weeklyInfo.toString();

    return {
      name: data.find('h4 a').text(),
      stars: +data.find('span').eq(0).text(),
      coins: coins ? +coins.match(/\/icons\/coinsU?([0-9]+)\.png/)[1] : 0,
      diff,
      featured,
      epic,
      daily: wasDaily ? dailyInfo.attr('title') : null,
      weekly: wasWeekly ? weeklyInfo.attr('title') : null,
    };
  });

  return {
    top: isInTop ? stats[0] : 0,
    stars: isInTop ? stats[1] : stats[0],
    diamonds: isInTop ? stats[2] : stats[1],
    secretCoins: isInTop ? stats[3] : stats[2],
    userCoins: isInTop ? stats[4] : stats[3],
    demons: isInTop ? stats[5] : stats[4],
    cp: !!$('.creator').toString() ? last(stats) : 0,
    desc,
    created: created ? +new Date(created[1]) : null,
    location,
    video: video ? {
      embed: video[1],
      full: video[1].replace(/embed\//, 'watch?v='),
    } : null,
    mod,
    linked: !!$('.badge').toString(),
    followers,
    img: {
      explosion,
      player,
      ship,
      ball,
      bird,
      dart,
      robot,
      spider,
    },
    links: Object.keys(links).length ? links : null,
    badges,
    lastLevels: lastLevels.length ? lastLevels : null,
  };
}

module.exports = searchUser;
