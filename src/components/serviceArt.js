import {
  AirVent,
  Bug,
  CircleAlert,
  Droplets,
  Ellipsis,
  Fan,
  Flame,
  Hammer,
  Lightbulb,
  PaintRoller,
  Power,
  Refrigerator,
  Snowflake,
  Sparkles,
  Tv,
  Volume2,
  WashingMachine,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';

// Services and categories without an uploaded icon get drawn art: a soft tile with a
// line glyph chosen from their name. Admin-uploaded icons always win (see ServiceIcon).
// Order matters: the first matching rule is used.
const ART_RULES = [
  { match: /\ba\.?c\b|air ?con|air condition|cooling/i, icon: AirVent, tone: 'sky' },
  { match: /(fridge|refrigerator|freezer)/i, icon: Refrigerator, tone: 'sky' },
  { match: /(washing|washer|laundry|appliance)/i, icon: WashingMachine, tone: 'lilac' },
  { match: /\b(fan|ceiling fan)/i, icon: Fan, tone: 'mint' },
  { match: /(electric|wiring|wire|switch|socket|power|inverter)/i, icon: Zap, tone: 'sun' },
  { match: /(light|lamp|bulb)/i, icon: Lightbulb, tone: 'sun' },
  { match: /(plumb|pipe|tap|leak|water|drain|bathroom|toilet)/i, icon: Droplets, tone: 'sky' },
  { match: /(paint|wall)/i, icon: PaintRoller, tone: 'peach' },
  { match: /(carpent|wood|furniture|door|cupboard)/i, icon: Hammer, tone: 'sand' },
  { match: /(clean|housekeep|sanit)/i, icon: Sparkles, tone: 'mint' },
  { match: /(pest|termite|insect)/i, icon: Bug, tone: 'sand' },
  { match: /(tv|television|electronic)/i, icon: Tv, tone: 'lilac' },
  { match: /(gas|stove|cook|chimney)/i, icon: Flame, tone: 'peach' },
];

const FALLBACK = { icon: Wrench, tone: 'mint' };

// `item` is a service ({ name, category }) or a category ({ name }); a service with no
// matching name falls back to its category's art so siblings look like a family.
export function artFor(item) {
  const names = [item?.name, item?.category?.name].filter(Boolean);

  for (const name of names) {
    const rule = ART_RULES.find((candidate) => candidate.match.test(name));
    if (rule) return rule;
  }

  return FALLBACK;
}

// Common "what's wrong?" issues get a matching glyph; anything else a neutral one.
const ISSUE_RULES = [
  { match: /(cool|cold|warm|heat|temperature)/i, icon: Snowflake },
  { match: /(leak|water|drip|wet)/i, icon: Droplets },
  { match: /(noise|sound|rattl|hum)/i, icon: Volume2 },
  { match: /(spark|shock|power|trip|electric|not (work|start|turn))/i, icon: Power },
  { match: /(smell|odou?r|smoke|air)/i, icon: Wind },
  { match: /(spin|fan)/i, icon: Fan },
  { match: /(install|new|setup|fit)/i, icon: Wrench },
];

export function issueIcon(issue) {
  if (issue?.key === 'OTHER') return Ellipsis;
  const text = `${issue?.key || ''} ${issue?.label || ''}`.replace(/_/g, ' ');
  return (ISSUE_RULES.find((rule) => rule.match.test(text)) || { icon: CircleAlert }).icon;
}
