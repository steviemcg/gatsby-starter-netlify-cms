---
templateKey: blog-post
title: >-
  The dangers of deploying the Web.config with Sitecore v9 - broken or slow
  loading images.
date: 2018-08-21T18:01:29.398Z
description: >-
  Including the Web.config as part of a deployment has cost me days of
  investigation for a variety of reasons, which I'm going to document below to
  help others searching for the exceptions on Google. 
tags:
  - sitecore
  - deployment
---
In hindsight this could have been avoided, but my personal preference is to source-control the web.config and apply transformations using XDT files for the different environments and/or server roles. I tend to do this because it makes it easy to redeploy my solution onto different servers and my solution has plenty of assemblyBinding bindingRedirects which are constantly changing. Until now this has served me well.

**tl;dr** The Web.config files for CM and CD servers are significantly different, so make sure a CM Web.config isn't deployed to your Delivery servers. If you're interested in the journey, read on…

The first symptom I found was slow-loading or broken images. Looking into the logs, the exception that appears is:

```System.Web.HttpException (0x80004005): The request queue limit of the session is exceeded.
	at System.Web.SessionState.SessionStateModule.QueueRef()
	at System.Web.SessionState.SessionStateModule.PollLockedSession()
	at System.Web.SessionState.SessionStateModule.GetSessionStateItem()
	at System.Web.SessionState.SessionStateModule.BeginAcquireState(Object source, EventArgs e, AsyncCallback cb, Object extraData)
```

My searching let me first to https://codingsight.com/what-dangers-can-update-of-dot-net-hide/  which identifies the source of the issue as https://referencesource.microsoft.com/#system.web/Util/AppSettings.cs,5541036387247256,references - and in turn searching for the `aspnet:RequestQueueLimitPerSession` setting led me to an article on [Sitecore's own Knowledge Base site](https://kb.sitecore.net/articles/858026)  where it mentions configuring the following setting in the Web.config

`<add key="aspnet:RequestQueueLimitPerSession" value="25"/>`

I changed this to the int.MaxValue value
`<add key="aspnet:RequestQueueLimitPerSession" value="2147483647"/>`

This solved the exceptions being thrown but the images still loaded slowly and I felt uneasy changing a setting that Sitecore specifically recommend setting to something so low. I still hadn't found the root cause, and I'd opened up the Session State store to Denial of Service attacks.

I ran a dotTrace on the staging site and it pinpointed **Sitecore.Analytics.Media.MediaRequestSessionModule** as a hotspot. I fired up dotPeek and spotted that it checks the `xDB.Tracking.Enabled` setting before execution. Disabling this setting solved the problem and the images were loading rapidly again, but the consequence was that I had disabled in-session personalisation and I was still frustrated that I hadn't found the root cause.

I left it for a day and was looking at another issue, where the /sitecore/ URL was not adequately secured. I knew this was supposed to be set in the Web.config, which led me to realise that I had made a mistake with the deployment. Using Beyond Compare, I quickly found that the Web.config files for CM and CD are significantly different, and sure enough, one of the key differences is that Sitecore.Analytics.Media.MediaRequestSessionModule is replaced by Sitecore.Analytics.RobotDetection.Media.MediaRequestSessionModule, and `<authentication mode="Forms">` is replaced by `<authentication mode="None">`.

Adjusting my XDT transforms to ensure the Web.config is as it should be on both CM and CD has completely solved my issue. For those who deploy their solutions in a similar way, here is the XDT transform below.

    <?xml version="1.0" encoding="utf-8"?>
    <configuration xmlns:xdt="http://schemas.microsoft.com/XML-Document-Transform">
        <configSections>
            <section name="packageInstallation" xdt:Transform="Remove" xdt:Locator="Match(name)"  />
        </configSections>
        <appSettings>
            <add key="role:define" value="ContentDelivery" xdt:Transform="SetAttributes" xdt:Locator="Match(key)" />
            <add key="Telerik.AsyncUpload.ConfigurationEncryptionKey" xdt:Transform="Remove" xdt:Locator="Match(key)" />
            <add key="Telerik.Upload.ConfigurationHashKey" xdt:Transform="Remove" xdt:Locator="Match(key)" />
            <add key="Telerik.Web.UI.DialogParametersEncryptionKey" xdt:Transform="Remove" xdt:Locator="Match(key)" />
        </appSettings>
        <system.web>
            <compilation xdt:Transform="RemoveAttributes(debug)" />
            <customErrors xdt:Transform="Replace" mode="On" defaultRedirect="/500.html" />
            <authentication mode="None" xdt:Transform="SetAttributes">
                <forms xdt:Transform="RemoveAttributes(loginUrl)" />
            </authentication>
        </system.web>
        <system.webServer>
            <modules>
                <add type="Sitecore.Analytics.RobotDetection.Media.MediaRequestSessionModule, Sitecore.Analytics.RobotDetection" name="MediaRequestSessionModule" xdt:Locator="Match(name)" xdt:Transform="SetAttributes" />
            </modules>
            <handlers>
                <add name="Telerik_Web_UI_DialogHandler_aspx" xdt:Transform="Remove" xdt:Locator="Match(name)" />
                <add name="Telerik_Web_UI_SpellCheckHandler_axd" xdt:Transform="Remove" xdt:Locator="Match(name)" />
                <add name="Telerik_Web_UI_WebResource_axd" xdt:Transform="Remove" xdt:Locator="Match(name)" />
            </handlers>
        </system.webServer>
        <location path="sitecore modules/Shell" xdt:Transform="Remove" xdt:Locator="Match(path)" />
        <location path="sitecore modules/admin" xdt:Transform="Remove" xdt:Locator="Match(path)" />
        <location path="sitecore/shell/Themes/Standard" xdt:Transform="Remove" xdt:Locator="Match(path)" />
        <location path="sitecore/shell/controls/Lib" xdt:Transform="Remove" xdt:Locator="Match(path)" />
        <location path="sitecore/shell/client/Speak" xdt:Transform="Remove" xdt:Locator="Match(path)" />
        <location path="sitecore" xdt:Transform="Insert">
            <system.web>
                <authorization>
                    <deny users="*"/>
                </authorization>
            </system.web>
        </location>
        <location path="sitecore/api" xdt:Transform="Insert">
            <system.web>
                <authorization>
                    <allow users="*"/>
                </authorization>
            </system.web>
        </location>
        <location path="sitecore/service" xdt:Transform="Insert">
            <system.web>
                <authorization>
                    <allow users="*"/>
                </authorization>
            </system.web>
        </location>
        <location path="sitecore/shell/themes" xdt:Transform="Insert">
            <system.web>
                <authorization>
                    <allow users="*"/>
                </authorization>
            </system.web>
        </location>
        <packageInstallation xdt:Transform="Remove" />
    </configuration>

I hope this helps someone. I'd still like to know the reasoning behind Sitecore choosing a low figure of 25 for the aspnet:RequestQueueLimitPerSession setting so I'll reach out for help. If you have any thoughts & ideas then please sound off in the comments below.
