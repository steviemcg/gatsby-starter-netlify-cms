---
templateKey: blog-post
title: 'EXM and the complexity of Subscription Management'
date: 2019-02-10T12:30:00.000Z
tags:
  - sitecore
  - exm
---
In EXM, email campaigns are dispatched to a one **or more** lists. While that sounds like a feature, it is its biggest complication.

These lists can be static (Contact Lists) or a Segment of one of those lists (Segmented Lists). The segment can also be of the entire Contacts database. Either way, these segments are powered by the rules engine, which behind the scenes executes a search query against Solr or Azure Search.

The first issue I’ll try and describe in this article is with unsubscribes. If an email is sent to two Contact Lists, and a Contact clicks “Unsubscribe”, then which list are they actually unsubscribing from? EXM solves this problem by removing the Contact from **all** of these lists. Ouch.

The Contact doesn’t have any visibility of these lists. There is no concept of defining lists as “public” or “private” and the Contact does not have a way of identifying why they were sent an email out of the box.  After all, these lists might be named something like "Qualified Leads", or "VIPs", or "Unreliable payers". That's not something you want to show to your customers. In any case, these lists don't necessarily map to Email Campaigns, so removing Contacts from these lists is, in my opinion, an invasive action.

The problem gets even worse when an email is dispatched to a Segmented List. The segment might be something simple like "Country is The Netherlands". If a Contact is unsubscribing, there is no static Contact List to unsubscribe from. EXM has to solve this problem by adding the Contact to the [Global Opt-Out List](https://doc.sitecore.com/developers/exm/91/email-experience-manager/en/configuring-the-global-opt-out-list.html), to ensure they never receive **any** emails from the brand ever again.

So to give an example, imagine:
  - You are being careful to only use Lists which map to Email Campaigns.
  - You are only using **one** "include list" per email campaign.
  - Using List names which are customer-friendly, i.e. can be public. Such as "Product updates", "Monthly newsletter" and "Events".

That's all very well, but let's take this further:
  - You have an event coming up in The Netherlands, so you create a Segmented List of "Country is The Netherlands" based off the "Events" Contact List, and dispatch the email.
  - A Contact decides to unsubscribe.
  - EXM can't remove Contacts from Segmented Lists, and doesn't attempt to determine that it could just remove the Contact from the "Events" Contacts list. (Segmented Lists can also be from the entire database).
  - EXM adds the Contact to the Global Opt-Out list.
  - The Contact no longer receives any emails, even though it was only their intention to unsubscribe from Events emails.

Not so good. It’s also one of the main reasons the "Sample Subscription Form" was removed from EXM in Sitecore 9, because the default behaviour was confusing and incomplete, and the responsibility was put on Sitecore customers and partners to solve the problem in the way they thought most appropriate for their organisation.

Luckily Sitecore have moved towards solving this in version 9.1. If you're not lucky enough to be on this version yet, and you want to provide a good experience for your customers which also satisfies GDPR / Double opt-in requirements, then you should just use a single static Contact List per email campaign.

## Email Preference Center
The release of Sitecore 9.1 introduces the much needed extra layer of preferences when determining who to send an email to. These preferences are designed to be visible to the customer, and Sitecore supplies a very simple UI out of the box, which is easy to skin to your own brand. (By the way, it makes use of a REST API, so you can easily move the example code to your own JSS / MVC component if you wish.)

![EXM Preference Center](/img/exm-complex-subscription-management/exm-preference-center.png)

Contacts can now choose easily which emails they prefer to receive, in a way which solves all of the problems I listed above. It's such a vast improvement on the existing Unsubscribe functionality that I feel the old functionality should be removed outright. For more information about the Preference Center, see the [official documentation](https://doc.sitecore.com/developers/exm/91/email-experience-manager/en/configuring-the-preference-center.html) and [Pete Navarra's write-up](https://sitecorehacker.com/2018/12/19/managing-the-unsubscribe-part-3/).

The second issue I want to describe in this article is the User Experience for marketers, specifically how many steps are necessary to set up a targeted email campaign.

Let's take an example. I want to send an email to all the people who have signed up to "Computers" emails, that live in The Netherlands. These are the steps from the Recipient Tab.

  1. Click the expand arrow
  2. Click "Create Segmented List" (opens new browser tab)
  3. Switch tab
  4. Type in a name
  5. Click expand arrow under List Segments
  6. Click "Create New Segment"
  7. Type in a name
  8. Click Add button under Segmentation
  9. Click "Edit Rule" button
  10. Type in "Country" to filter the rules
  11. Click "where the contact's preferred address country code compares to specific value"
  12. Click "compares to"
  13. Click OK ("is case insensitive and equal to" is correct)
  14. Click Specific Value
  15. Type in NL
  16. Click OK to exit rule
  17. Type "Preference" to filter the rules
  18. Click "where the contact has (not) subscribed to marketing preference marketing preference for the manager root manager root"
  19. Click “has (not) subscribed”
  20. Click has subscribed (why is this step necessary? This is what the *where / except where* toggle is for)
  21. Click OK
  22. Click “marketing preference”
  23. Click "Email types" to expand it
  24. Click “Computers”
  25. Click OK
  26. Click manager root
  27. Click Email
  28. Click OK
  29. Click OK to exit Rule screen
  30. Click Save to save Segment and exit Segment screen
  31. Click Save to save Segmented List
  32. Switch to EXM tab
  33. Refresh the page to be able to select the newly created list
		
That is **33** steps to select my target audience, to those from The Netherlands! Luckily that Segmented List can be reused in the future if I want to use the exact same filter. But bear in mind I need to follow these steps for every single Email Type, for every single Manager Root.

This might be easier to bear if you can use Segmented Lists as the source of other Segmented Lists, but that’s not the case, a source list must be a Contact List. That means you need to duplicate all those steps every time you want to Segment your Contacts in a slightly different way.

To hammer home my point, let’s compare it to Mailchimp:

  1. Click “Add recipients”
  2. Click “Choose a list”
  3. Select the list (this would be the equivalent to Email Type in Sitecore)
  4. Under Segment or Tag, click “All subscribers on list”
  5. Click “Group or new segment”
  6. Click “Add”
  7. Click the field drop-down
  8. Choose “Country”
  9. Type in “NL”
  10. Click “Save”

That’s a difference of **23** steps.

## So what now?
That’s a bit of a moan, I realise. Somebody once taught me that when you come with a problem you should also come with a suggested solution, so here's how I think the experience for marketers could be improved.

### Make it easier to choose the Email Type, and make it required
Don’t make marketers use List Manager to filter by email type, especially when it’s something they might forget to do! Add a required dropdown to the email UI which chooses one of the email types (i.e. Computers, <example>). It shows just the Email Types which have been assigned to this Manager Root. And then it automatically filters the Contacts to those who have opted in to receive emails of this type. Add a last extra option such as “Adhoc service message” to be able to email Contacts who have not necessary opted in to a marketing email.

### Allow to segment directly in EXM
Instead of being forced to create a list every time, why not just expose the Rules Engine in the EXM UI? List Manager is only a wrapper around the Segmentation Engine after all. The “Include Lists” panel becomes redundant if the marketer is forced to choose an email type, so this area can be replaced with an interface that lets the marketer add segmentation rules directly. Such as the “Contacts in The Netherlands” example I gave above, which would save 23 steps. If the marketer still wants to use a list for a segment, this can still be done in the Rules Engine.

I'll try to illustrate what I mean. Please excuse my Microsoft Paint mock-up.

![An example of how embedded the Rules Engine into EXM might look](/img/exm-complex-subscription-management/inline-rules.png "An example of how embedded the Rules Engine into EXM might look")

### Set a default “Service Message” value per Email Type
Setting emails as a Service Message bypasses all preferences of the Contact, and must only be used when it is in the interest of Contact to receive the email, and it must not be a marketing email. This gives a lot (too much?) responsibility to the marketers and I feel this setting belongs on the Email Type itself, which can be controlled by a user with more permissions (i.e. somebody in the EXM Advanced Users role). And again, it’s something which is easily forgotten, and the consequences of getting this wrong can be severe under GDPR rules.

### Importing extra columns from CSV files, and being able to Segment by them, is still a developer task
Custom data on Contacts is defined in configuration files which need to be deployed to Sitecore and xConnect, before they can be stored, indexed and therefore used in Segmentation. This means it is still a developer task to enable. 

If this wasn’t the case, marketers could upload new data using CSV files, or be able to use the data captured by Form submissions, without needing new development and deployments. Mailchimp can do this and it’s free. This is probably an unrealistic request as the change is too big, but one can dream.

While I’m on the subject, there are several facets out of the box which aren’t exposed in List Manager by default. I’d love some obvious ones to be added such as Phone, City, Country, and Preferred Language.

### Provide an interface to add a contact, or a CSV file of contacts, to an Email Type
In List Manager it is possible to add a single Contact using the UI, or a batch of Contacts in a CSV file. This was useful in EXM if the primary way of sending emails is with Contact Lists. But if this should now be using Email Type preferences, then it’s important to be able to manage this easily and quickly as well.

### Add a tab to the Experience Profile for marketers to change the preferences
As well as being able to manage Email Type subscriptions from the Email Type itself, it’d be nice to be able to edit a single Contact’s preferences as well when looking at their Experience Profile.

### `DoNotMarket` and `ConsentRevoked` are not multi-site
These two flags are exposed in Marketing Automation, and are respected by EXM. But bear in mind they are not multi-site, so if your Sitecore solution is for multiple brands where Contacts wouldn’t expect these preferences to be shared, then this isn’t so useful.

An alternative solution is to add contacts to  the Global Opt-Out list of a particular Manager Root. But I’d like to see a solution to multi-tenant which is generic across the entire Sitecore / xConnect platform, instead of each component solving it in their own ways.

*That’s enough for  now. Thanks for reading!*