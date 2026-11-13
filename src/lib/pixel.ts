import { whopPublicConfig } from '@/config'

/**
 * Official Whop Pixel bootstrap, copied from the Whop pixel install guide.
 *
 * The queue stub lets `whop.track(...)` calls made before the remote script
 * arrives flush in order. `setScope` must receive the public account ID; the
 * Pixel needs no API key and carries no customer data by itself.
 */
const PIXEL_QUEUE_STUB =
  '!function(w,u,n,a){if(w[n])return;a=w[n]={q:[],t:+new Date,s:[],o:u,track:function(){a.q.push([+new Date].concat([].slice.call(arguments)))},setScope:function(){a.s=[].slice.call(arguments).filter(function(x){return typeof x==="string"});a.q.push([+new Date,"setScope"].concat(a.s))},scope:function(){var c=[].slice.call(arguments);return{track:function(){a.q.push([+new Date].concat([].slice.call(arguments)).concat([{__scope:c}]))}}}}}(window,"https://t.whop.tw","whop");'

export const WHOP_PIXEL_SCRIPT_ORIGIN = 'https://t.whop.tw'

/**
 * The remote Pixel loader. It is rendered as a real `<script async src>` tag
 * instead of being injected by the inline stub, so the head matches what the
 * server rendered and hydration never sees an extra node.
 */
export const WHOP_PIXEL_SCRIPT_URL = `${WHOP_PIXEL_SCRIPT_ORIGIN}/s.js`

export function whopPixelBootstrapScript(): string {
  return `${PIXEL_QUEUE_STUB}\nwhop.setScope(${JSON.stringify(
    whopPublicConfig.accountId,
  )});\nwhop.track("page");`
}
