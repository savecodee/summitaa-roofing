import { whopPublicConfig } from '../config/whop'

/**
 * Official Whop Pixel bootstrap, copied from the Whop pixel install guide.
 *
 * The queue stub lets `whop.track(...)` calls made before the remote script
 * arrives flush in order. `setScope` must receive the public account ID; the
 * Pixel needs no API key and carries no customer data by itself.
 */
const PIXEL_QUEUE_STUB =
  '!function(w,d,s,u,n,a,b){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}};b=d.createElement(s);b.async=1;b.src=u+"/s.js";d.getElementsByTagName(s)[0].parentNode.insertBefore(b,d.getElementsByTagName(s)[0])}(window,document,"script","https://t.whop.tw","whop");'

export const WHOP_PIXEL_SCRIPT_ORIGIN = 'https://t.whop.tw'

export function whopPixelBootstrapScript(): string {
  return `${PIXEL_QUEUE_STUB}\nwhop.setScope(${JSON.stringify(
    whopPublicConfig.accountId,
  )});\nwhop.track("page");`
}
