-- Create patient_demographics table
CREATE TABLE IF NOT EXISTS patient_demographics (
  id               BIGSERIAL PRIMARY KEY,
  abha_number      VARCHAR(17) UNIQUE NOT NULL,   -- e.g. "91-2751-8266-5651"
  abha_address     VARCHAR(100),                  -- e.g. "smruti19935@abdm"
  eka_oid          VARCHAR(50),                   -- for Eka API calls (X-Pt-Id)
  eka_uuid         VARCHAR(100),
  first_name       VARCHAR(100),
  middle_name      VARCHAR(100),
  last_name        VARCHAR(100),
  full_name        VARCHAR(200),
  gender           CHAR(1),                       -- 'M', 'F', 'O'
  year_of_birth    INT,
  month_of_birth   INT,
  day_of_birth     INT,
  mobile           VARCHAR(15),
  address          TEXT,
  pincode          VARCHAR(10),
  state_name       VARCHAR(100),
  district_name    VARCHAR(100),
  kyc_verified     BOOLEAN DEFAULT FALSE,
  profile_photo_b64 TEXT,                         -- Base64 profile photo
  source           VARCHAR(20) DEFAULT 'abdm',
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

-- Index for optimized lookups
CREATE INDEX IF NOT EXISTS idx_pat_dem_abha_address ON patient_demographics(abha_address);
CREATE INDEX IF NOT EXISTS idx_pat_dem_mobile ON patient_demographics(mobile);
