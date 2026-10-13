## Fix "email rate limit exceeded"

Ini bukan bug di code — ini rate limiting Supabase Auth (default 4 emails/jam di free tier).

### Fix di Supabase Dashboard

1. Buka [https://supabase.com/dashboard/project/tfuowbybtslzseycfdju/auth/providers](https://supabase.com/dashboard/project/tfuowbybtslzseycfdju/auth/providers)

2. Klik **Email** provider

3. **Turn OFF** "Confirm email" toggle

4. **Save**

5. Tunggu 1 jam atau **restart Supabase project** (kalo mau cepet — di Settings → General → Restart project)

### Alternatively

Jalankan SQL ini di Supabase SQL Editor untuk bypass rate limit:

```sql
-- Disable email confirmation at Auth level
-- (kadang butuh beberapa menit untuk propagate)
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
WHERE email_confirmed_at IS NULL;
```

Atau, lebih clean — update User via Dashboard:
- Buka **Authentication → Users**
- Pilih user `sadarin1@gmail.com` (yang baru aja lu coba daftar)
- Klik **"Confirm email"** manual

### Habis disable confirm email

User baru yang daftar **langsung** bisa login tanpa perlu cek email. Kalo lu pengen test sekarang juga tanpa nunggu:

1. **Authentication → Users** di Supabase
2. Pilih user `sadarin1@gmail.com` yang baru dibuat
3. Klik **"..."** → **"Confirm email"** (manual confirm)
4. Coba login dengan credentials itu

### Setelah fix, test full flow

1. Register `sadarin1@gmail.com` (yang udah ke-create) → udah confirmed, langsung active
2. Login → redirect ke dashboard
3. **Master admin** `mediana@gmail.com` → bisa akses `/master`

Beri tahu gw kalo udah fix! 🚀