// Auth — users stored in localStorage, tokens in localStorage
const Auth = (() => {
  const USERS_KEY = 'pv_users';
  const SESSION_KEY = 'pv_session';

  const defaultTheme = () => ({
    primaryColor:   '#22c55e',
    secondaryColor: '#2563eb',
    bgColor:        '#0f0f1a',
    textColor:      '#ffffff',
    accentColor:    '#f59e0b',
    bgType:         'gradient',
    bgGradient:     'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 100%)',
    bgImage:        null,
    bgVideo:        null,
    fontFamily:     'Inter',
    cardStyle:      'glass',
    layout:         'default',
    bgImageFilters: { brightness:100, contrast:100, saturation:100, hue:0 },
  });

  function getUsers() {
    try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
    catch { return {}; }
  }
  function saveUsers(u) { localStorage.setItem(USERS_KEY, JSON.stringify(u)); }

  function hash(str) {
    // djb2 — demo only, NOT for production
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h) + str.charCodeAt(i);
    return (h >>> 0).toString(36);
  }

  function generateToken(len = 40) {
    return Array.from(crypto.getRandomValues(new Uint8Array(len)))
      .map(b => b.toString(16).padStart(2,'0')).join('');
  }

  return {
    getUsers,

    current() {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (!s) return null;
      const users = getUsers();
      return users[s.username] || null;
    },

    register(username, password, displayName, email) {
      if (!username || username.length < 3)  return { error: 'Username must be at least 3 characters' };
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: 'Username can only contain letters, numbers and _' };
      if (!password || password.length < 6)  return { error: 'Password must be at least 6 characters' };
      if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?~`]/.test(password)) return { error: 'Password must contain at least one special character (e.g. !@#$%)' };
      if (!email || !email.includes('@'))     return { error: 'Invalid email address' };

      const users = getUsers();
      if (users[username]) return { error: 'Username is taken' };

      const emailLower = email.toLowerCase().trim();
      if (Object.values(users).some(u => u.email === emailLower)) {
        return { error: 'Email address is already in use' };
      }

      const activationToken = generateToken();
      users[username] = {
        username,
        displayName: displayName || username,
        password:    hash(password),
        email:       emailLower,
        createdAt:   Date.now(),
        activated:   false,
        activationToken,
        resetToken:  null,
        resetExpiry: null,
        theme:       defaultTheme(),
        bio:         '',
        links:       [],
        mediaIds:    [],
        musicIds:    [],
        avatarMediaId: null,
        bannerMediaId: null,
        followers:   [],
        following:   [],
        events:      [],
        friends:           [],
        friendRequests:    [], // incoming: [{ from, ts }]
        sentRequests:      [], // outgoing: [username]
        mixIds:            [],
        subscription:      'free', // 'free' | 'pro'
        role:              'lytter', // 'lytter' | 'dj' | 'produsent' | 'plateselskap'
        labelName:         '',       // navn på plateselskapet (kun for role === 'plateselskap')
        buyUrl:            '',       // plateselskapets faste kjøps-/nettstedslenke
        profileVisibility: 'public', // 'public' | 'private'
      };
      saveUsers(users);
      return { success: true, user: users[username], activationToken };
    },

    login(usernameOrEmail, password) {
      const users = getUsers();
      // support login by username OR email
      let user = users[usernameOrEmail];
      if (!user) {
        user = Object.values(users).find(u => u.email === usernameOrEmail.toLowerCase().trim());
      }
      if (!user)               return { error: 'User does not exist' };
      if (user.password !== hash(password)) return { error: 'Wrong password' };
      if (!user.activated)     return { error: 'Account not activated. Check your email.', notActivated: true };

      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, ts: Date.now() }));
      return { success: true, user };
    },

    logout() {
      const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
      if (s?.username) localStorage.removeItem(`pv_online_${s.username}`);
      localStorage.removeItem(SESSION_KEY);
    },

    setOnline(username) {
      if (!username) return;
      localStorage.setItem(`pv_online_${username}`, Date.now().toString());
    },

    clearOnline(username) {
      if (username) localStorage.removeItem(`pv_online_${username}`);
    },

    isOnline(username) {
      const ts = parseInt(localStorage.getItem(`pv_online_${username}`) || '0', 10);
      return ts > 0 && (Date.now() - ts) < 120000;
    },

    // Activate account with token
    activate(token) {
      const users = getUsers();
      const user = Object.values(users).find(u => u.activationToken === token);
      if (!user) return { error: 'Invalid or expired activation link' };
      user.activated = true;
      user.activationToken = null;
      saveUsers(users);
      return { success: true, user };
    },

    // Generate password reset token
    forgotPassword(email) {
      const users = getUsers();
      const user = Object.values(users).find(u => u.email === email.toLowerCase().trim());
      if (!user) return { error: 'No account with this email address' };
      const token = generateToken();
      user.resetToken  = token;
      user.resetExpiry = Date.now() + 3600_000; // 1 hour
      saveUsers(users);
      return { success: true, token, username: user.username, email: user.email };
    },

    // Reset password with token
    resetPassword(token, newPassword) {
      if (!newPassword || newPassword.length < 6) return { error: 'Password must be at least 6 characters' };
      if (!/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?~`]/.test(newPassword)) return { error: 'Password must contain at least one special character (e.g. !@#$%)' };
      const users = getUsers();
      const user = Object.values(users).find(u => u.resetToken === token);
      if (!user)                       return { error: 'Invalid or expired link' };
      if (Date.now() > user.resetExpiry) return { error: 'The link has expired. Request a new one.' };
      user.password    = hash(newPassword);
      user.resetToken  = null;
      user.resetExpiry = null;
      // Fullført reset beviser e-posteierskap → aktiver kontoen (speiler serveren),
      // så en uaktivert bruker ikke blir stengt ute etter tilbakestilling.
      user.activated       = true;
      user.activationToken = null;
      saveUsers(users);
      return { success: true };
    },

    updateUser(username, data) {
      const users = getUsers();
      if (!users[username]) return false;
      Object.assign(users[username], data);
      saveUsers(users);
      // Publiser eierens egen profil til sky-sync (om aktivert) så ALLE ser
      // endringene. Kun for den innloggede eieren; fire-and-forget.
      try {
        const sess = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
        if (sess && sess.username === username && typeof window !== 'undefined' && window.ProfileSync) {
          window.ProfileSync.push(users[username]);
        }
      } catch (_) {}
      return true;
    },

    // Flett en profil hentet fra sky-sync inn i den lokale brukerlista, slik at
    // getUser()/renderView ser ANDRE brukeres profiler (ellers kun localStorage).
    // Lokale auth-felt (passord, e-post, tokens) på en evt. eksisterende rad
    // bevares — vi legger kun de offentlige feltene oppå.
    cacheRemoteProfile(username, data) {
      if (!username || !data || typeof data !== 'object') return false;
      const users = getUsers();
      users[username] = Object.assign({}, users[username] || {}, data, { username });
      saveUsers(users);
      return true;
    },

    // Speil en konto hentet fra serveren (api/auth.js) inn i den lokale brukerlista,
    // slik at resten av appen — som bruker den synkrone Auth-API-en — virker uendret.
    // Serveren er sannhetskilden for konto-feltene (e-post, rolle, aktivert); lokale
    // presentasjonsfelt (tema, venner, media) bevares. Passord lagres ALDRI lokalt
    // for server-kontoer (verifisering skjer på serveren).
    adoptServerUser(serverUser, opts = {}) {
      if (!serverUser || !serverUser.username) return null;
      const users = getUsers();
      const existing = users[serverUser.username];
      const skeleton = existing || {
        username:          serverUser.username,
        theme:             defaultTheme(),
        bio:               '',
        links:             [],
        mediaIds:          [],
        musicIds:          [],
        avatarMediaId:     null,
        bannerMediaId:     null,
        followers:         [],
        following:         [],
        events:            [],
        friends:           [],
        friendRequests:    [],
        sentRequests:      [],
        mixIds:            [],
        subscription:      'free',
        role:              'lytter',
        profileVisibility: 'public',
      };
      const merged = Object.assign({}, skeleton, {
        username:    serverUser.username,
        displayName: serverUser.displayName || skeleton.displayName || serverUser.username,
        email:       (serverUser.email || skeleton.email || '').toLowerCase(),
        role:        serverUser.role || skeleton.role || 'lytter',
        activated:   serverUser.activated != null ? serverUser.activated : skeleton.activated,
        createdAt:   serverUser.createdAt || skeleton.createdAt || Date.now(),
      });
      delete merged.password;          // server-kontoer har ikke lokalt passord
      users[serverUser.username] = merged;
      saveUsers(users);
      if (opts.login) {
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: serverUser.username, ts: Date.now() }));
      }
      return merged;
    },

    getUser(username) {
      return getUsers()[username] || null;
    },

    // Slett ein brukar heilt + rydd referansar hos alle andre (vener, forespurnader, følgjarar).
    deleteUser(username) {
      const users = getUsers();
      if (!users[username]) return false;
      delete users[username];
      for (const k in users) {
        const u = users[k];
        if (u.friends)        u.friends        = u.friends.filter(f => f !== username);
        if (u.sentRequests)   u.sentRequests   = u.sentRequests.filter(f => f !== username);
        if (u.friendRequests) u.friendRequests = u.friendRequests.filter(r => r.from !== username);
        if (u.followers)      u.followers      = u.followers.filter(f => f !== username);
        if (u.following)      u.following      = u.following.filter(f => f !== username);
      }
      saveUsers(users);
      return true;
    },

    getAllPublicUsers() {
      return Object.values(getUsers()).map(u => ({
        username:    u.username,
        displayName: u.displayName,
        bio:         u.bio,
        theme:       u.theme,
        avatarUrl:     u.avatarUrl || null,
        avatarPath:    u.avatarPath || null,
        avatarMediaId: u.avatarMediaId,
        bannerUrl:     u.bannerUrl || null,
        bannerPath:    u.bannerPath || null,
        bannerMediaId: u.bannerMediaId || null,
        createdAt:   u.createdAt,
        favoriteRadio: u.favoriteRadio || null,
        liveEvent: (u.events || []).find(e => e.isLive) || null,
        musicIds:  u.musicIds  || [],
        role:      u.role      || 'lytter',
      }));
    },

    // Follow / unfollow
    toggleFollow(actorUsername, targetUsername) {
      const users = getUsers();
      const actor  = users[actorUsername];
      const target = users[targetUsername];
      if (!actor || !target) return false;
      const idx = actor.following.indexOf(targetUsername);
      if (idx === -1) {
        actor.following.push(targetUsername);
        target.followers.push(actorUsername);
      } else {
        actor.following.splice(idx, 1);
        target.followers.splice(target.followers.indexOf(actorUsername), 1);
      }
      saveUsers(users);
      return idx === -1 ? 'followed' : 'unfollowed';
    },

    isFollowing(actorUsername, targetUsername) {
      const users = getUsers();
      return users[actorUsername]?.following?.includes(targetUsername) ?? false;
    },

    // ── Friend requests ─────────────────────────────────────────────────
    sendFriendRequest(fromUsername, toUsername) {
      const users = getUsers();
      const from = users[fromUsername];
      const to   = users[toUsername];
      if (!from || !to) return { error: 'User not found' };
      if (fromUsername === toUsername) return { error: 'Cannot send a friend request to yourself' };

      from.friends      = from.friends      || [];
      from.sentRequests = from.sentRequests  || [];
      to.friends        = to.friends         || [];
      to.friendRequests = to.friendRequests  || [];

      if (from.friends.includes(toUsername)) return { error: 'You are already friends' };
      if (from.sentRequests.includes(toUsername)) return { error: 'Request already sent' };
      if (to.friendRequests.some(r => r.from === fromUsername)) return { error: 'Request already sent' };

      from.sentRequests.push(toUsername);
      to.friendRequests.push({ from: fromUsername, ts: Date.now() });
      saveUsers(users);
      return { success: true };
    },

    acceptFriendRequest(myUsername, fromUsername) {
      const users = getUsers();
      const me   = users[myUsername];
      const from = users[fromUsername];
      if (!me || !from) return { error: 'User not found' };

      me.friends        = me.friends        || [];
      me.friendRequests = me.friendRequests  || [];
      from.friends      = from.friends       || [];
      from.sentRequests = from.sentRequests  || [];

      me.friendRequests = me.friendRequests.filter(r => r.from !== fromUsername);
      from.sentRequests = from.sentRequests.filter(u => u !== myUsername);

      if (!me.friends.includes(fromUsername)) me.friends.push(fromUsername);
      if (!from.friends.includes(myUsername)) from.friends.push(myUsername);

      saveUsers(users);
      return { success: true };
    },

    rejectFriendRequest(myUsername, fromUsername) {
      const users = getUsers();
      const me   = users[myUsername];
      const from = users[fromUsername];
      if (!me) return { error: 'User not found' };

      me.friendRequests = (me.friendRequests || []).filter(r => r.from !== fromUsername);
      if (from) from.sentRequests = (from.sentRequests || []).filter(u => u !== myUsername);

      saveUsers(users);
      return { success: true };
    },

    cancelFriendRequest(fromUsername, toUsername) {
      const users = getUsers();
      const from = users[fromUsername];
      const to   = users[toUsername];
      if (!from) return { error: 'User not found' };

      from.sentRequests = (from.sentRequests || []).filter(u => u !== toUsername);
      if (to) to.friendRequests = (to.friendRequests || []).filter(r => r.from !== fromUsername);

      saveUsers(users);
      return { success: true };
    },

    // Skriv en INNKOMMENDE venneforespørsel inn i den innlogga brukarens eigen
    // record. Venneforespørslar kjem berre over Gun som eit varsel (Notify) — utan
    // dette landar dei aldri i mottakaren si `friendRequests`-liste, og
    // getFriendStatus() gir 'none' i staden for 'pending_received' (so Aksepter/
    // Avslå-knappane på profilen aldri dukkar opp). Idempotent på `from`.
    receiveFriendRequest(myUsername, fromUsername, ts) {
      const users = getUsers();
      const me = users[myUsername];
      if (!me || myUsername === fromUsername) return { error: 'User not found' };
      me.friends        = me.friends        || [];
      me.friendRequests = me.friendRequests || [];
      if (me.friends.includes(fromUsername)) return { success: false };        // allereie venner
      if (me.friendRequests.some(r => r.from === fromUsername)) return { success: false };
      me.friendRequests.push({ from: fromUsername, ts: ts || Date.now() });
      saveUsers(users);
      return { success: true };
    },

    // Fullfør vennskapet på AVSENDAR-sida når mottakaren har akseptert (kjem over
    // Gun som eit friend_accept-varsel). Sendarens `sentRequests` → `friends`.
    confirmFriendAccept(myUsername, otherUsername) {
      const users = getUsers();
      const me = users[myUsername];
      if (!me || myUsername === otherUsername) return { error: 'User not found' };
      me.friends      = me.friends      || [];
      me.sentRequests = me.sentRequests || [];
      me.sentRequests = me.sentRequests.filter(u => u !== otherUsername);
      if (!me.friends.includes(otherUsername)) me.friends.push(otherUsername);
      saveUsers(users);
      return { success: true };
    },

    removeFriend(myUsername, targetUsername) {
      const users = getUsers();
      const me     = users[myUsername];
      const target = users[targetUsername];
      if (!me) return { error: 'User not found' };

      me.friends     = (me.friends     || []).filter(u => u !== targetUsername);
      if (target) target.friends = (target.friends || []).filter(u => u !== myUsername);

      saveUsers(users);
      return { success: true };
    },

    getFriendStatus(myUsername, targetUsername) {
      const users = getUsers();
      const me = users[myUsername];
      if (!me) return 'none';
      if ((me.friends || []).includes(targetUsername)) return 'friends';
      if ((me.sentRequests || []).includes(targetUsername)) return 'pending_sent';
      if ((me.friendRequests || []).some(r => r.from === targetUsername)) return 'pending_received';
      return 'none';
    },

    getPendingRequestsCount(username) {
      const user = getUsers()[username];
      return (user?.friendRequests || []).length;
    },

    getFriends(username) {
      const users = getUsers();
      const user = users[username];
      if (!user) return [];
      return (user.friends || []).map(u => users[u]).filter(Boolean);
    },

    defaultTheme,

    importQRUser(data) {
      const users = getUsers();
      if (users[data.username]) {
        if (users[data.username].password !== data.password) return { error: 'User already exists with a different password' };
        localStorage.setItem(SESSION_KEY, JSON.stringify({ username: data.username, ts: Date.now() }));
        return { success: true, user: users[data.username] };
      }
      users[data.username] = {
        username:          data.username,
        displayName:       data.displayName || data.username,
        password:          data.password,
        email:             data.email,
        createdAt:         Date.now(),
        activated:         true,
        activationToken:   null,
        resetToken:        null,
        resetExpiry:       null,
        theme:             defaultTheme(),
        bio:               '',
        links:             [],
        mediaIds:          [],
        musicIds:          [],
        avatarMediaId:     null,
        bannerMediaId:     null,
        followers:         [],
        following:         [],
        events:            [],
        friends:           [],
        friendRequests:    [],
        sentRequests:      [],
        mixIds:            [],
        subscription:      data.subscription || 'free',
        role:              data.role || 'lytter',
        profileVisibility: 'public',
      };
      saveUsers(users);
      localStorage.setItem(SESSION_KEY, JSON.stringify({ username: data.username, ts: Date.now() }));
      return { success: true, user: users[data.username] };
    },
  };
})();
