import admin from './admin.js';
import auth from './auth.js';
import cards from './cards.js';
import common from './common.js';
import customer from './customer.js';
import profile from './profile.js';
import provider from './provider.js';
import publicPages from './public.js';

// One module per app area; keys are addressed as `area.section.key`.
export default { common, public: publicPages, auth, profile, customer, cards, provider, admin };
