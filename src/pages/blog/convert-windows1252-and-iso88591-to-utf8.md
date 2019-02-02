---
templateKey: blog-post
title: 'Converting Windows-1252 and ISO-8859-1 to UTF-8 in C#'
date: 2018-06-14T00:04:10.000Z
description: >-
  Recently, I have been working on an age-old problem. When importing data from
  a third-party system, characters are showing up incorrectly.
tags:
  - 'c#'
---
For example, **?** instead of **&eacute;**, or **&#x25a1;** instead of &bull;

Like most websites these days, mine is stored and displayed in UTF-8. However, the system I'm importing from: Windows-1252.

I've read in several places that Windows-1252 is, for the most part, a subset of UTF-8 and therefore shouldn't cause many issues. So I spent untold hours investigating whether the issue in fact lied with the ODBC driver or errors in how I'd configured it. It didn't help that the vendor told me the set is ISO-8859-1 by mistake, which is a very common misconception.

Then I stumbled across [this post](http://www.i18nqa.com/debug/table-iso8859-1-vs-windows-1252.html) which describes specific differences between the two character sets. Low and behold: the &bull; character is in the list. It appears I've got more work to do.

### Character sets v.s. Encoding
As a brief recap, it's worth explaining the difference between Character **Sets** and **Encodings**. 

Example character sets are:

- ASCII, with a mere 128 characters, i.e. Latin a-z A-Z 0-9 and some non-printable characters
- ISO-8859-1 is 256 characters, adding some non-English characters such as **&#x00D1;**
- Unicode, where the intention is that it will hold all the characters you'll ever need. At the time of writing (we're on version 11 by now), **137,000** characters have been assigned with several languages such as Chinese (中文), Russian (русский), and even Emoji &#x1f44c; However, there is room for a whopping total of **1,112,064** characters in the future.

Encodings define how the characters are encoded and decoded. Earlier character sets could easily be addressed using a single byte, but the larger sets all need multiple bytes to address such a large space.

Examples:

- UTF-8: Variable length, between 1 and 4 bytes. *The* standard for the web and I dare say much more.
- UTF-16: Variable length, either 2 or 4 bytes. Used internally by Windows, .NET, JavaScript, i.e. with in-memory strings.
- UTF-32: Fixed length, always 4 bytes.

Choosing between these encodings may be important when designing specialist APIs, or where speed / memory / disk-space is a genuine concern. For most of us, UTF-8 is the way to go.

### An example of how to convert a string from one encoding to another
```
using System.Text;

public static string ConvertStringEncoding(string txt, Encoding srcEncoding, Encoding dstEncoding)
{
    if (string.IsNullOrEmpty(txt))
    {
        return txt;
    }

    if (srcEncoding == null)
    {
        throw new System.ArgumentNullException(nameof(srcEncoding));
    }

    if (dstEncoding == null)
    {
        throw new System.ArgumentNullException(nameof(dstEncoding));
    }

    var srcBytes = srcEncoding.GetBytes(txt);
    var dstBytes = Encoding.Convert(srcEncoding, dstEncoding, srcBytes);
    return dstEncoding.GetString(dstBytes);
}
```

### So what's the problem?

In my case, &bull; characters were showing up as _ symbols in the browser. It turns out, this isn't a problem with the encoding at all, but the same character address meaning different things to different character sets.

The &bull; character when imported was showing in C# as `\u0095` which is a Unicode Code Point. It is still a single character. In Unicode, 0x0095 (integer 149) is technically a control character and isn't designed to be shown, which is why I suspected a problem with the ODBC drivers. However in Windows-1252, 0x0095 **is** the bullet. Oops &#x1F926;

I expected there to be a library method in .NET to help with this conversion - I've searched high and low without any success. I feel I must be missing something but to work around the problem I have written the following method to manually map Windows-1252 characters to their Unicode equivalents.

### Converting a string from Windows-1252 to UTF-8

```
using System.Text;

private static readonly Dictionary<int, char> CharactersToMap = new Dictionary<int, char>
{
    {130, '‚'},
    {131, 'ƒ'},
    {132, '„'},
    {133, '…'},
    {134, '†'},
    {135, '‡'},
    {136, 'ˆ'},
    {137, '‰'},
    {138, 'Š'},
    {139, '‹'},
    {140, 'Œ'},
    {145, '‘'},
    {146, '’'},
    {147, '“'},
    {148, '”'},
    {149, '•'},
    {150, '–'},
    {151, '—'},
    {152, '˜'},
    {153, '™'},
    {154, 'š'},
    {155, '›'},
    {156, 'œ'},
    {159, 'Ÿ'},
    {173, '-'}
};

public static string ConvertFromWindowsToUnicode(string txt)
{
    if (string.IsNullOrEmpty(txt))
    {
        return txt;
    }

    var sb = new StringBuilder();
    foreach (var c in txt)
    {
        var i = (int)c;

        if (i >= 130 && i <= 173 && CharactersToMap.TryGetValue(i, out var mappedChar))
        {
            sb.Append(mappedChar);
            continue;
        }

        sb.Append(c);
    }

    return sb.ToString();
}
```

### Closing Remarks

I've done a fair bit of research so far, and the method above is working well for me. If you know of a better way (or the "correct" way!), please reach out to me on Twitter. Thanks for reading!

### References

- http://www.i18nqa.com/debug/table-iso8859-1-vs-windows-1252.html
- http://javaevangelist.blogspot.com/2012/07/iso-8859-1-character-encodings.html
- https://www.cablechipsolutions.com/character-sets-encoding-utf8-and-iso8859-1.html
- http://kunststube.net/encoding/
