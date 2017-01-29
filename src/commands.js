import _ from 'lodash';
import childProcess from 'child_process';
import fetch from 'isomorphic-fetch';

const twitchUrl = 'https://api.twitch.tv/kraken';
const headers = {
  accept: 'application/vnd.twitchtv.v5+json',
  'client-id': '2n7irufqjtyyayigyc4ubzq174axeex'
};

function rowTemplate(number, name, viewers, game) {
  const numberColumns = 6;
  const nameColumns = 21;
  const viewersColumns = 13;
  const gameColumns = 40;
  const paddedNumber = _.padEnd(
    _.truncate(number, { length: numberColumns }), numberColumns);
  const paddedName = _.padEnd(
    _.truncate(name, { length: nameColumns }), nameColumns);
  const paddedViewers = _.padEnd(
    typeof(number) === 'number'
      ? _.truncate(
        new Intl.NumberFormat().format(viewers), {
          length: viewersColumns
        })
      : viewers, viewersColumns);
  const truncatedGame = _.truncate(game, { length: gameColumns });
  return ` ${paddedNumber}${paddedName}${paddedViewers}${truncatedGame}\n`;
}

async function list(number = null, game = null) {
  const seperator = '-'.repeat(80) + '\n';
  let result = '';
  result += seperator;
  result += rowTemplate('#', 'name', 'viewers', 'game');
  result += seperator;
  let url = `${twitchUrl}/streams`;
  if (number) {
    url += `?limit=${number}`;
    if (game) {
      url += `&game=${game}`;
    }
  } else if (game) {
    url += `?game=${game}`;
  }
  const response = await fetch(url, { headers });
  const json = await response.json();
  json['streams'].forEach((stream, i) => {
    result += rowTemplate(i + 1,
      stream['channel']['name'],
      stream['viewers'],
      stream['game']);
  });
  return result.slice(0, -1); // remove extra endline
}

async function check(channelName) {
  const encodedName = encodeURIComponent(channelName);
  const url = `${twitchUrl}/search/streams?query=${encodedName}&limit=100`;
  const response = await fetch(url, { headers });
  const json = await response.json();
  const { streams } = json;
  const found = streams.find(stream => {
    return stream.channel.display_name === channelName;
  });
  if (found === undefined) {
    return `${channelName} is offline or doesn't exist`;
  }
  const game = found['game'];
  const viewers = new Intl.NumberFormat().format(found['viewers']);
  return `${channelName} is playing ${game} with ${viewers} viewers`;
}

function watch(channel, quality) {
  return childProcess.spawn(
    'livestreamer', [`https://twitch.tv/${channel}`, quality]);
}

export default { list, watch, check };
