---
templateKey: blog-post
title: 'Hosting Sitecore behind a Load Balancer with non-standard ports'
date: 2019-03-04T10:30:00.000Z
tags:
  - sitecore
  - c#
---

Recently I ran into the situation where the infrastructure team required Sitecore to run on non-standard ports. In this case, Sitecore was running behind a Load Balancer. The Load Balancer itself was on the standard port 443, but translated the requests behind the scenes to the custom port.

![Infrastructure](/img/sc-non-standard-ports/infrastructure.png)

Without further customisation, in this situation Sitecore will expose this port 8443 to the user. It sees this custom port as the truth, and isn't aware that the end-user is expected to use the standard port 443.

## What about customising the LinkProvider?

Sitecore allows customising the **Site** element with some relevant attributes:

- `scheme` - The **http** or **https** part of the Url - not easy to find in the documentation but always worth setting
- `port` - The port receiving the request in IIS, in this case 8443
- `externalPort` - The port that should be visible to the end-user, in this case 443

**Cheeky tip:** The default LinkProvider, (via `WebUtil.GetServerUrl`) will strip away port 80 from the Url but not port 443. If you are setting the *scheme* to https as mentioned above, then you can cheat by setting the externalPort to 80. It isn't strictly correct of course, but the https:// in the URL gives you the desired result.

## Not everything uses the LinkManager ☹

The problem is that not everything in Sitecore uses the LinkManager. In our testing we ran into failed connection attempts:

1. Successful login redirects to https://sitename:8443/sitecore/
2. Graphiql tries to make a web-socket connection to port 8443
3. Errors in the logs: Scheduling.UrlAgent started. Url: https://sitename:8443/sitecore/service/keepalive.aspx

This is because Sitecore often uses `WebUtil.GetFullUrl` and `WebUtil.GetServerUrl` which will output the port from **IIS**. (In points 1 and 2 above I'm not sure why an absolute url was necessary, a relative Url would have sufficed).

Seeing as these two methods are `Static` and not configurable in any way, I reached out to Sitecore Support for advice.

## The simple solution

Add the following appSetting in your web.config under `<appSettings>`:

`<add key="aspnet:UseHostHeaderForRequestUrl" value="true" />`

It shouldn't have been a surprise to me that this issue isn't unique to Sitecore. Thanks to Alexey Tupkalo from Sitecore Support for providing the solution almost instantly.

If you choose to use this solution, then the `externalPort` tweak to the `<site>` node mentioned above is no longer necessary.

More information on the different .Net appSettings can be found here: https://docs.microsoft.com/en-us/previous-versions/aspnet/hh975440(v=vs.120)

The remarks from the documentation:

*If this value attribute is false, the Url property is dynamically built from the host, port, and path provided by the web server. If this value attribute is true, the Url property is dynamically built by using the host and port provided by the incoming "Host" header and the path provided by the web server.*

Thanks for reading!