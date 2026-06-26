// Auth — users stored in localStorage, tokens in localStorage
const Auth = (() => {
  const USERS_KEY = 'pv_users';
  const SESSION_KEY = 'pv_session';

  const defaultTheme = () => ({
    primaryColor:   '#7c3aed',
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
      if (!username || username.length < 3)  return { error: 'Brukernavn må være minst 3 tegn' };
      if (!/^[a-zA-Z0-9_]+$/.test(username)) return { error: 'Brukernavn kan bare ha bokstaver, tall og _' };
      if (!password || password.length < 6)  return { error: 'Passord må være minst 6 tegn' };
      if (!email || !email.includes('@'))     return { error: 'Ugyldig e-postadresse' };

      const users = getUsers();
      if (users[username]) return { error: 'Brukernavn er tatt' };

      const emailLower = email.toLowerCase().trim();
      if (Object.values(users).some(u => u.email === emailLower)) {
        return { error: 'E-postadressen er allerede i bruk' };
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
        roles:             [],     // lytter | musikk-skaper | dj | sosial (multi-select)
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
      if (!user)               return { error: 'Bruker finnes ikke' };
      if (user.password !== hash(password)) return { error: 'Feil passord' };
      if (!user.activated)     return { error: 'Konto ikke aktivert. Sjekk e-posten din.', notActivated: true };

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
      if (!user) return { error: 'Ugyldig eller utløpt aktiveringslenke' };
      user.activated = true;
      user.activationToken = null;
      saveUsers(users);
      return { success: true, user };
    },

    // Generate password reset token
    forgotPassword(email) {
      const users = getUsers();
      const user = Object.values(users).find(u => u.email === email.toLowerCase().trim());
      if (!user) return { error: 'Ingen konto med denne e-postadressen' };
      const token = generateToken();
      user.resetToken  = token;
      user.resetExpiry = Date.now() + 3600_000; // 1 hour
      saveUsers(users);
      return { success: true, token, username: user.username, email: user.email };
    },

    // Reset password with token
    resetPassword(token, newPassword) {
      if (!newPassword || newPassword.length < 6) return { error: 'Passord må være minst 6 tegn' };
      const users = getUsers();
      const user = Object.values(users).find(u => u.resetToken === token);
      if (!user)                       return { error: 'Ugyldig eller utløpt lenke' };
      if (Date.now() > user.resetExpiry) return { error: 'Lenken har utløpt. Be om ny.' };
      user.password    = hash(newPassword);
      user.resetToken  = null;
      user.resetExpiry = null;
      saveUsers(users);
      return { success: true };
    },

    updateUser(username, data) {
      const users = getUsers();
      if (!users[username]) return false;
      Object.assign(users[username], data);
      saveUsers(users);
      return true;
    },

    getUser(username) {
      return getUsers()[username] || null;
    },

    getAllPublicUsers() {
      return Object.values(getUsers()).map(u => ({
        username:    u.username,
        displayName: u.displayName,
        bio:         u.bio,
        theme:       u.theme,
        avatarMediaId: u.avatarMediaId,
        createdAt:   u.createdAt,
        favoriteRadio: u.favoriteRadio || null,
        liveEvent: (u.events || []).find(e => e.isLive) || null,
        musicIds:  u.musicIds  || [],
        roles:     u.roles     || [],
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
      if (!from || !to) return { error: 'Bruker ikke funnet' };
      if (fromUsername === toUsername) return { error: 'Kan ikke sende venneforespørsel til deg selv' };

      from.friends      = from.friends      || [];
      from.sentRequests = from.sentRequests  || [];
      to.friends        = to.friends         || [];
      to.friendRequests = to.friendRequests  || [];

      if (from.friends.includes(toUsername)) return { error: 'Dere er allerede venner' };
      if (from.sentRequests.includes(toUsername)) return { error: 'Forespørsel allerede sendt' };
      if (to.friendRequests.some(r => r.from === fromUsername)) return { error: 'Forespørsel allerede sendt' };

      from.sentRequests.push(toUsername);
      to.friendRequests.push({ from: fromUsername, ts: Date.now() });
      saveUsers(users);
      return { success: true };
    },

    acceptFriendRequest(myUsername, fromUsername) {
      const users = getUsers();
      const me   = users[myUsername];
      const from = users[fromUsername];
      if (!me || !from) return { error: 'Bruker ikke funnet' };

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
      if (!me) return { error: 'Bruker ikke funnet' };

      me.friendRequests = (me.friendRequests || []).filter(r => r.from !== fromUsername);
      if (from) from.sentRequests = (from.sentRequests || []).filter(u => u !== myUsername);

      saveUsers(users);
      return { success: true };
    },

    cancelFriendRequest(fromUsername, toUsername) {
      const users = getUsers();
      const from = users[fromUsername];
      const to   = users[toUsername];
      if (!from) return { error: 'Bruker ikke funnet' };

      from.sentRequests = (from.sentRequests || []).filter(u => u !== toUsername);
      if (to) to.friendRequests = (to.friendRequests || []).filter(r => r.from !== fromUsername);

      saveUsers(users);
      return { success: true };
    },

    removeFriend(myUsername, targetUsername) {
      const users = getUsers();
      const me     = users[myUsername];
      const target = users[targetUsername];
      if (!me) return { error: 'Bruker ikke funnet' };

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
  };
})();
