const selectFields = `
  id,
  email,
  first_name,
  last_name,
  phone,
  address,
  gender,
  avatar_style,
  profile_image,
  profile_image_mime,
  theme_preference,
  signup_date,
  role
`;

const buildDefaultAvatar = (customer) => {
  const seed = `${customer.first_name || "Guest"}-${customer.last_name || "User"}`;
  const style = customer.gender === "female" ? "lorelei" : "thumbs";
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}&backgroundType=gradientLinear&radius=50`;
};

const mapCustomerRow = (row) => {
  if (!row) {
    return null;
  }
  let avatar = null;
  if (row.profile_image && row.profile_image_mime) {
    const base64 = row.profile_image.toString("base64");
    avatar = `data:${row.profile_image_mime};base64,${base64}`;
  } else {
    avatar = buildDefaultAvatar(row);
  }
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: `${row.first_name} ${row.last_name}`.trim(),
    phone: row.phone,
    address: row.address,
    gender: row.gender,
    theme: row.theme_preference,
    avatarStyle: row.avatar_style,
    avatar,
    signupDate: row.signup_date,
    role: row.role,
  };
};

export const findCustomerByEmail = async (pool, email) => {
  const [rows] = await pool.query(
    `SELECT ${selectFields} FROM customers WHERE email = ?`,
    [email]
  );
  return rows[0] || null;
};

export const getCustomerWithSensitiveData = async (pool, email) => {
  const [rows] = await pool.query(
    `SELECT id, email, password_hash, first_name, last_name, gender, role, theme_preference FROM customers WHERE email = ?`,
    [email]
  );
  return rows[0] || null;
};

export const getCustomerById = async (pool, id) => {
  const [rows] = await pool.query(
    `SELECT ${selectFields} FROM customers WHERE id = ?`,
    [id]
  );
  return mapCustomerRow(rows[0]);
};

const parseDataUrlImage = (value) => {
  if (!value) {
    return null;
  }
  const match = /^data:(.+);base64,(.+)$/i.exec(value);
  if (!match) {
    return null;
  }
  return {
    mime: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
};

export const createCustomer = async (
  pool,
  { email, passwordHash, firstName, lastName, phone, address, gender, theme }
) => {
  const [result] = await pool.query(
    `INSERT INTO customers (email, password_hash, first_name, last_name, phone, address, gender, theme_preference, signup_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [
      email,
      passwordHash,
      firstName,
      lastName,
      phone || null,
      address || null,
      gender || "other",
      theme || "sunrise",
    ]
  );
  return getCustomerById(pool, result.insertId);
};

export const updateCustomerProfile = async (
  pool,
  id,
  { firstName, lastName, phone, address, gender, theme, avatarStyle, profileImage }
) => {
  const assignments = [];
  const params = [];

  if (firstName !== undefined) {
    assignments.push("first_name = ?");
    params.push(firstName);
  }
  if (lastName !== undefined) {
    assignments.push("last_name = ?");
    params.push(lastName);
  }
  if (phone !== undefined) {
    assignments.push("phone = ?");
    params.push(phone || null);
  }
  if (address !== undefined) {
    assignments.push("address = ?");
    params.push(address || null);
  }
  if (gender !== undefined) {
    assignments.push("gender = ?");
    params.push(gender || "other");
  }
  if (theme !== undefined) {
    assignments.push("theme_preference = ?");
    params.push(theme);
  }
  if (avatarStyle !== undefined) {
    assignments.push("avatar_style = ?");
    params.push(avatarStyle);
  }
  if (profileImage !== undefined) {
    const parsed = parseDataUrlImage(profileImage);
    if (parsed) {
      assignments.push("profile_image = ?", "profile_image_mime = ?");
      params.push(parsed.buffer, parsed.mime);
    } else if (profileImage === null) {
      assignments.push("profile_image = NULL", "profile_image_mime = NULL");
    }
  }

  if (!assignments.length) {
    return getCustomerById(pool, id);
  }

  params.push(id);
  await pool.query(
    `UPDATE customers SET ${assignments.join(", ")}, updated_at = NOW() WHERE id = ?`,
    params
  );

  return getCustomerById(pool, id);
};

export const mapCustomer = mapCustomerRow;
