import admin from './admin.js';
import auth from './auth.js';
import cards from './cards.js';
import chats from './chats.js';
import common from './common.js';
import customer from './customer.js';
import invoice from './invoice.js';
import more from './more.js';
import profile from './profile.js';
import provider from './provider.js';
import publicPages from './public.js';

// One module per app area; keys are addressed as `area.section.key`.
export default { common, public: publicPages, auth, profile, customer, invoice, cards, chats, more, provider, admin };
