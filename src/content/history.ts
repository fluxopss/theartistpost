/**
 * The Artist Post History — sourced public record only.
 * Do not invent artists, events, venues, or finances beyond the citations.
 */

export const history = {
  title: "The Artist Post History",
  kicker: "A house that started as a post",
  lead: "The Artist Post began in 2014 as a place for every kind of artist to be seen. More than a decade later it is a 501(c)(3) with a live room on Clematis Street and a plan for chapters nationwide — still led by the same founder, still built on kindness.",
  honesty:
    "This timeline is a public record, not a myth. Dates come from contemporaneous coverage, the founder’s public profile, IRS and state charity filings, and theartistpost.org. We do not invent artists, events, or finances.",
  foundedLabel: "Founded December 2014",
  eras: [
    {
      id: "founding",
      year: "2014",
      sortKey: 2014,
      title: "A post from the service",
      body: "Robbie Alvarez founded The Artist Post in December 2014. He was then serving as an active-duty member of the United States Coast Guard. The idea was not a gallery with a guest list — it was a place that would let art in every form be showcased, and might bring people together again.",
      facts: [
        "Founder CEO, The Artist Post, Inc. — December 2014 to present (LinkedIn).",
        "Year founded listed as 2014 on the company’s public profiles.",
      ],
    },
    {
      id: "site",
      year: "2015",
      sortKey: 2015,
      title: "The site, after a failed Kickstarter",
      body: "The first Kickstarter to fund TheArtistPost.com did not succeed. Family help and personal savings launched the main site in spring 2015 from Katy, Texas. TAP was framed as a social platform for artists across genres — musicians, photographers, dancers, filmmakers, actors, comedians, and models — with free profiles and media-only posts, so the feed stayed art instead of noise.",
      facts: [
        "Main site launched spring 2015 after an unsuccessful Kickstarter (StartUp Beat, March 11, 2016).",
        "Headquarters listed as Katy, Texas; described as bootstrapped.",
      ],
    },
    {
      id: "app",
      year: "2016",
      sortKey: 2016,
      title: "TAP App",
      body: "A second Kickstarter, this time for a mobile app, succeeded. As of the March 2016 StartUp Beat pitch, The Artist Post mobile app (TAP App) was in alpha. Robbie was still on active Coast Guard duty and still the founder and CEO. The elevator pitch stayed the same: a platform for artists spanning all artistic genres.",
      facts: [
        "Second Kickstarter funded TAP App development; app in alpha testing as of March 2016.",
        "StartUp Beat: “Robbie Alvarez is an active duty United States Coast Guard member.”",
      ],
    },
    {
      id: "charity",
      year: "2020",
      sortKey: 2020,
      title: "A public charity",
      body: "The work took nonprofit form. The IRS recognized The Artist Post INC as a 501(c)(3) public charity, determination effective August 16, 2020 (ruling month October 2020). The classification is arts and cultural organizations — multipurpose. Contributions are deductible. The supporters page still publishes the Oklahoma 2020 determination letter.",
      facts: [
        "EIN 85-2609788 · Artist Post Inc / THE ARTIST POST INC.",
        "NTEE A20 — Arts, Cultural Organizations – Multipurpose.",
        "Public charity under 170(b)(1)(A)(vi); files Form 990-N (income under $25,000).",
        "Tennessee filing: legally established August 16, 2020, Broken Arrow, Oklahoma.",
      ],
    },
    {
      id: "papers",
      year: "2022",
      sortKey: 2022,
      title: "Papers follow the work",
      body: "Texas registered THE ARTIST POST, INC. as a foreign nonprofit corporation on August 4, 2022. In September 2023 the Texas address on file moved from Houston to Boynton Beach, Florida. Public listings have associated the organization with Houston, Katy, Boynton Beach, Broken Arrow, and West Palm Beach as the work moved with its founder — those are mailing and legal footprints, not invented chapter houses.",
      facts: [
        "Texas Secretary of State filing 0804671221, formed August 4, 2022.",
        "Registered-address change detected September 20, 2023: 16223 White Star Dr, Houston 77062 → 1200 Fosters Mill Ln, Boynton Beach, FL 33436.",
      ],
    },
    {
      id: "house",
      year: "Now",
      sortKey: 2026,
      title: "A house on Clematis",
      body: "The public home is a live room inside Hacienda at 522 Clematis Street, West Palm Beach: rotating artist showcases, donation-based merch, curated finds, and a stated mission to build a permanent home for art. The marks that travel with the work are The Artist Post®, Kindness Always®, and Love ALL · Dream TOGETHER · Create AS ONE™. The map on the supporters page is a nationwide chapter vision — Florida is the active hub; Oklahoma holds the 2020 legal presence; Idaho, Nevada, Tennessee, Washington, and Texas are on the map. SubCulture is the named partner. Robbie still reads the mail.",
      facts: [
        "Live venue and contact published on theartistpost.org and theartistpost.fluxlab.agency.",
        "Robbie@theartistpost.org · 832-833-9100.",
        "Tennessee charitable registration CO53341 (renewal June 30, 2026); solicitation listed for FL, ID, MN, TX, and WA.",
        "FY2024 Tennessee solicitation filing: $500 public contributions, $0 expenses — a 990-N year, cited as a public number, not a story.",
      ],
    },
  ],
  sources: [
    {
      label: "StartUp Beat — Featured Startup Pitch (March 11, 2016)",
      href: "https://startupbeat.com/featured-startup-pitch-artist-post-social-media-platform-artists/21597/",
    },
    {
      label: "Robbie Alvarez — LinkedIn (Founder CEO, Dec 2014–present)",
      href: "https://www.linkedin.com/in/robbiealvarez",
    },
    {
      label: "The Artist Post, Inc. — LinkedIn company page",
      href: "https://www.linkedin.com/company/the-artist-post",
    },
    {
      label: "theartistpost.org — live room, contact, supporters certificates",
      href: "https://theartistpost.org/",
    },
    {
      label: "CharityScoop — Artist Post Inc, EIN 85-2609788",
      href: "https://charityscoop.info/artist-post-inc-852609788/",
    },
    {
      label: "TaxExemptWorld — Artist Post Inc, Boynton Beach",
      href: "https://www.taxexemptworld.com/organization.asp?tn=2777960",
    },
    {
      label: "Texas Secretary of State — THE ARTIST POST, INC. (0804671221)",
      href: "http://www.datalog.co.uk/browse/detail.php/CompanyNumber/USTX0804671221/CompanyName/THE+ARTIST+POST%2C+INC.",
    },
  ],
} as const;

export const historyMetaDescription =
  "The Artist Post History — founded December 2014 by Robbie Alvarez, 501(c)(3) in 2020, live room at Hacienda on Clematis Street. A sourced public record.";
