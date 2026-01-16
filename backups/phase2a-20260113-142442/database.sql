--
-- PostgreSQL database dump
--

\restrict EKdDTni3mmjgv1Kr1bKcjgkqOpDWBMGcdlenp5e4g5btGtxD6VNMEcoRazX6jXA

-- Dumped from database version 15.15
-- Dumped by pg_dump version 15.15

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_events_cache; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.audit_events_cache (
    event_id character varying(100) NOT NULL,
    event_type character varying(50) NOT NULL,
    actor character varying(50) NOT NULL,
    actor_role character varying(50) NOT NULL,
    action character varying(255) NOT NULL,
    resource character varying(100) NOT NULL,
    resource_id character varying(100) NOT NULL,
    status text NOT NULL,
    error_message text,
    ip_address character varying(50),
    user_agent character varying(255),
    before_state json,
    after_state json,
    "timestamp" timestamp with time zone NOT NULL,
    tx_id character varying(100) NOT NULL,
    CONSTRAINT audit_events_cache_status_check CHECK ((status = ANY (ARRAY['SUCCESS'::text, 'FAILURE'::text])))
);


ALTER TABLE public.audit_events_cache OWNER TO ibn_user;

--
-- Name: certificate_revocations; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.certificate_revocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    certificate_serial character varying(255) NOT NULL,
    wallet_id character varying(255),
    revoked_by uuid,
    revocation_reason character varying(255),
    revoked_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.certificate_revocations OWNER TO ibn_user;

--
-- Name: chaincode_proposals; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.chaincode_proposals (
    proposal_id character varying(100) NOT NULL,
    chaincode_name character varying(50) NOT NULL,
    version character varying(20) NOT NULL,
    proposed_by character varying(50) NOT NULL,
    proposed_at timestamp with time zone NOT NULL,
    description text NOT NULL,
    language character varying(20) NOT NULL,
    source_code_hash character varying(64) NOT NULL,
    package_id character varying(100),
    status text NOT NULL,
    approvals json,
    required_approvals integer NOT NULL,
    target_channels json,
    endorsement_policy text NOT NULL,
    security_audit boolean NOT NULL,
    audit_report character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT chaincode_proposals_status_check CHECK ((status = ANY (ARRAY['DRAFT'::text, 'SUBMITTED'::text, 'APPROVED'::text, 'REJECTED'::text, 'DEPLOYED'::text])))
);


ALTER TABLE public.chaincode_proposals OWNER TO ibn_user;

--
-- Name: channel_configs; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.channel_configs (
    channel_id character varying(50) NOT NULL,
    channel_name character varying(255) NOT NULL,
    organizations json NOT NULL,
    orderers json NOT NULL,
    endorsement_policy text NOT NULL,
    lifecycle_policy text NOT NULL,
    block_size integer NOT NULL,
    batch_timeout integer NOT NULL,
    status text NOT NULL,
    created_by character varying(50) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT channel_configs_status_check CHECK ((status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text, 'ARCHIVED'::text])))
);


ALTER TABLE public.channel_configs OWNER TO ibn_user;

--
-- Name: jwt_keys; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.jwt_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key_id character varying(50) NOT NULL,
    private_key text NOT NULL,
    public_key text NOT NULL,
    algorithm character varying(20) DEFAULT 'RS256'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone
);


ALTER TABLE public.jwt_keys OWNER TO ibn_user;

--
-- Name: COLUMN jwt_keys.key_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.jwt_keys.key_id IS 'e.g., key-2025-12';


--
-- Name: COLUMN jwt_keys.private_key; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.jwt_keys.private_key IS 'RSA private key in PEM format';


--
-- Name: COLUMN jwt_keys.public_key; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.jwt_keys.public_key IS 'RSA public key in PEM format';


--
-- Name: COLUMN jwt_keys.is_active; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.jwt_keys.is_active IS 'Only one active key at a time';


--
-- Name: COLUMN jwt_keys.expires_at; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.jwt_keys.expires_at IS 'Key expiry for cleanup';


--
-- Name: knex_migrations; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.knex_migrations (
    id integer NOT NULL,
    name character varying(255),
    batch integer,
    migration_time timestamp with time zone
);


ALTER TABLE public.knex_migrations OWNER TO ibn_user;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: ibn_user
--

CREATE SEQUENCE public.knex_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knex_migrations_id_seq OWNER TO ibn_user;

--
-- Name: knex_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ibn_user
--

ALTER SEQUENCE public.knex_migrations_id_seq OWNED BY public.knex_migrations.id;


--
-- Name: knex_migrations_lock; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.knex_migrations_lock (
    index integer NOT NULL,
    is_locked integer
);


ALTER TABLE public.knex_migrations_lock OWNER TO ibn_user;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE; Schema: public; Owner: ibn_user
--

CREATE SEQUENCE public.knex_migrations_lock_index_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.knex_migrations_lock_index_seq OWNER TO ibn_user;

--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: ibn_user
--

ALTER SEQUENCE public.knex_migrations_lock_index_seq OWNED BY public.knex_migrations_lock.index;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.organizations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    msp_id character varying(100) NOT NULL,
    domain character varying(255) NOT NULL,
    ca_url character varying(255),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.organizations OWNER TO ibn_user;

--
-- Name: COLUMN organizations.msp_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.organizations.msp_id IS 'Fabric MSP ID (e.g., Org1MSP)';


--
-- Name: COLUMN organizations.ca_url; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.organizations.ca_url IS 'Certificate Authority URL';


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(150) NOT NULL,
    resource character varying(100) NOT NULL,
    action character varying(50) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.permissions OWNER TO ibn_user;

--
-- Name: COLUMN permissions.name; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.permissions.name IS 'Permission key in resource:action format';


--
-- Name: COLUMN permissions.resource; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.permissions.resource IS 'Resource name (users, channels, chaincodes, etc.)';


--
-- Name: COLUMN permissions.action; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.permissions.action IS 'Action (create, read, update, delete, query, invoke)';


--
-- Name: platform_policies; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.platform_policies (
    policy_id character varying(100) NOT NULL,
    policy_name character varying(255) NOT NULL,
    policy_type text NOT NULL,
    rules json NOT NULL,
    applies_to json NOT NULL,
    is_active boolean NOT NULL,
    version character varying(20) NOT NULL,
    created_by character varying(50) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    CONSTRAINT platform_policies_policy_type_check CHECK ((policy_type = ANY (ARRAY['ENDORSEMENT'::text, 'LIFECYCLE'::text, 'ACCESS_CONTROL'::text, 'COMPLIANCE'::text])))
);


ALTER TABLE public.platform_policies OWNER TO ibn_user;

--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.role_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.role_permissions OWNER TO ibn_user;

--
-- Name: COLUMN role_permissions.role_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.role_permissions.role_id IS 'Reference to roles table';


--
-- Name: COLUMN role_permissions.permission_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.role_permissions.permission_id IS 'Reference to permissions table';


--
-- Name: COLUMN role_permissions.granted_by; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.role_permissions.granted_by IS 'User who granted this permission';


--
-- Name: roles; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.roles OWNER TO ibn_user;

--
-- Name: COLUMN roles.is_system; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.roles.is_system IS 'System-defined role, cannot be deleted';


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    assigned_by uuid,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp with time zone
);


ALTER TABLE public.user_roles OWNER TO ibn_user;

--
-- Name: COLUMN user_roles.user_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.user_roles.user_id IS 'Reference to users table';


--
-- Name: COLUMN user_roles.role_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.user_roles.role_id IS 'Reference to roles table';


--
-- Name: COLUMN user_roles.assigned_by; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.user_roles.assigned_by IS 'User who assigned this role';


--
-- Name: COLUMN user_roles.expires_at; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.user_roles.expires_at IS 'Optional role expiration date';


--
-- Name: users; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    username character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    organization_id uuid,
    wallet_id character varying(255),
    certificate_serial character varying(255),
    enrolled boolean DEFAULT false,
    enrollment_secret character varying(255),
    enrolled_at timestamp with time zone,
    is_enrolled boolean DEFAULT false,
    fabric_identity_id character varying(255)
);


ALTER TABLE public.users OWNER TO ibn_user;

--
-- Name: COLUMN users.wallet_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.users.wallet_id IS 'Link to wallet (e.g., john@org1)';


--
-- Name: COLUMN users.certificate_serial; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.users.certificate_serial IS 'Certificate serial number for revocation';


--
-- Name: COLUMN users.enrolled; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.users.enrolled IS 'Whether user has been enrolled with Fabric CA';


--
-- Name: COLUMN users.enrollment_secret; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.users.enrollment_secret IS 'Temporary secret from CA registration';


--
-- Name: COLUMN users.enrolled_at; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.users.enrolled_at IS 'Timestamp of enrollment';


--
-- Name: wallets; Type: TABLE; Schema: public; Owner: ibn_user
--

CREATE TABLE public.wallets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label character varying(255) NOT NULL,
    certificate text NOT NULL,
    private_key text NOT NULL,
    encryption_iv character varying(32) NOT NULL,
    encryption_tag character varying(32) NOT NULL,
    msp_id character varying(100) NOT NULL,
    type character varying(20) DEFAULT 'X.509'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_used_at timestamp with time zone,
    certificate_expires_at timestamp with time zone,
    certificate_notified_at timestamp with time zone,
    revoked boolean DEFAULT false,
    revoked_at timestamp with time zone,
    revocation_reason character varying(100)
);


ALTER TABLE public.wallets OWNER TO ibn_user;

--
-- Name: COLUMN wallets.label; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.wallets.label IS 'Format: username@organization';


--
-- Name: COLUMN wallets.certificate; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.wallets.certificate IS 'X.509 certificate in PEM format';


--
-- Name: COLUMN wallets.private_key; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.wallets.private_key IS 'ENCRYPTED private key (AES-256-GCM)';


--
-- Name: COLUMN wallets.encryption_iv; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.wallets.encryption_iv IS 'Initialization vector for encryption';


--
-- Name: COLUMN wallets.encryption_tag; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.wallets.encryption_tag IS 'Authentication tag for GCM mode';


--
-- Name: COLUMN wallets.msp_id; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.wallets.msp_id IS 'Organization MSP ID';


--
-- Name: COLUMN wallets.last_used_at; Type: COMMENT; Schema: public; Owner: ibn_user
--

COMMENT ON COLUMN public.wallets.last_used_at IS 'Track wallet usage for cleanup';


--
-- Name: knex_migrations id; Type: DEFAULT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.knex_migrations ALTER COLUMN id SET DEFAULT nextval('public.knex_migrations_id_seq'::regclass);


--
-- Name: knex_migrations_lock index; Type: DEFAULT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.knex_migrations_lock ALTER COLUMN index SET DEFAULT nextval('public.knex_migrations_lock_index_seq'::regclass);


--
-- Data for Name: audit_events_cache; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.audit_events_cache (event_id, event_type, actor, actor_role, action, resource, resource_id, status, error_message, ip_address, user_agent, before_state, after_state, "timestamp", tx_id) FROM stdin;
\.


--
-- Data for Name: certificate_revocations; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.certificate_revocations (id, certificate_serial, wallet_id, revoked_by, revocation_reason, revoked_at) FROM stdin;
\.


--
-- Data for Name: chaincode_proposals; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.chaincode_proposals (proposal_id, chaincode_name, version, proposed_by, proposed_at, description, language, source_code_hash, package_id, status, approvals, required_approvals, target_channels, endorsement_policy, security_audit, audit_report, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: channel_configs; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.channel_configs (channel_id, channel_name, organizations, orderers, endorsement_policy, lifecycle_policy, block_size, batch_timeout, status, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: jwt_keys; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.jwt_keys (id, key_id, private_key, public_key, algorithm, is_active, created_at, expires_at) FROM stdin;
bedd88cb-7c6b-4bab-9d2a-301c6138716a	static-file-key	-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDHO0+uLamIEQiB\nq+9Eujyp2HEb86hmNisZh+kjkpoy5CyOc7Pu52Ij5x4Jg1HSAH/DBY5DOgO4WshI\ne7mAJ5Pqf7Btn8DFQkwEFz/38fvJC5xJBhqF2HIsDDMTm8FVkuZN6Z3I1jtw0aRw\nhf6yxABjAux7U3MnUKb9tWzXh4pfleSGjc6gmdzKnyISMKhgAKyhkHRqPg2Al4//\nQHI8yEkCve5xQ/1P75IlMkxLufw4/4MnF50X/Zf2hEtyxjy9grAs7qU+XpgVg7AL\nwplsk/r6x2Xij+UPOwyl+Z8huecP+LGPdMxEJa5kmFMe2wV8vjdBsjDuH78prtiP\n+BTL2iijAgMBAAECggEAD4sgD02+sT/q8vrwAuOowfOB95VN6ROGz0ocNUtFvnyw\nwThjrFre/EAWxtU49/JUBWoUjEglbCehAo6sjUQJNT1bDWJuTrV6asNJmVWGuEuw\nmL3iKdkWJzuYbIo1TjDUyPVV+wpDvuyMML8zfMzv3smmm4SKMmIHdTnHURVhBU3w\nJz2AsVrPGb4l1iiIL28DSfYPvZP7PJ0W1pGk40M9l0CP9tKCmpOfTB0fT8N5Y4mJ\nx+qfD+OmYxb21Lw2FpNbnl8d2B6L27vuInKQj8FJmo3bE9cqGCB8IJdY+XXd4BBv\n1BkXebJG4NCGcfOg0Nbu3CFL1q38+30g1x+e3fvisQKBgQDvLxFmK8OfrD/9reLS\ntkGuNkIOfiATPbB3zSt/0hujrf1+EqfyuIiR/Ctcysuh3B2JkL+HjXqoiwegKuku\n2TJiA+H/882L6y8B0e2lu02RDFJbV2PaU6GIo/V/cT4VrE6DU0baA8rGlJ5Cvqyh\nbFOwvLjRKT+oG0fwACD+Jygz+QKBgQDVPSrMwCouRU/+EvlzuxwikeQ3xvrwXjlI\nx3ZB1HZt1J5uf25B6adLefd+QSeS1uc3WVcvGbi+t1+If4mZV9lu3lxLNNE8hHbv\nGIBV9fn9yqKfNks84wZNOqt5a/Kp44Yi/jLf1jjuKqFuB6gRoMaqnZmYP1n5PdyA\ntRFrLb6wewKBgQCep8oSy9TnhYqs6zsaKmtG9Ba9JkyAdtsnnKDOGMDcwfz0M8vT\n5TQyIeNhmeOZajjtl2Z0tBQ42IAmblBfExOokIrJDR+7QDXeLzJETQoWvOWkUUOa\n/v6XdKrT7noQRkuOMR8+XmWTc+HGxFQef4zEH2s40vO2vuHpASzhaXfxgQKBgF5h\nb2MmnsTSGuC65zwpEf/fEOL7KDBhk/s5hYcHkc907xa7QkLcNxa6CigQkIJ2qeoe\nme8X9GQ9Z4RT5sQ/VNa0hqcm3oFpo/aZopvpfleta6MKdeyiEzT1hdX9SG+Xa9Rr\nLHtUJuiLZ936d5It1iDIFqaDS8B8d+9jtSz6F0+nAoGABewHpqmrstsqkU+NACrE\n0BskJOk5PnF7Dd9+mcf95QMx1XAhDG/XW3QE/0Mk5VWGHJQzElfh3nROcpUAJzrP\nLTsOS5hEjnzPUGuYVhlfyqtll87X0wX4yDSV497ZmpNtcTeGoxfNE8rOQwouR2Ht\nOWYh6OCUaj2U03DHrrsT8bE=\n-----END PRIVATE KEY-----\n	-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAxztPri2piBEIgavvRLo8\nqdhxG/OoZjYrGYfpI5KaMuQsjnOz7udiI+ceCYNR0gB/wwWOQzoDuFrISHu5gCeT\n6n+wbZ/AxUJMBBc/9/H7yQucSQYahdhyLAwzE5vBVZLmTemdyNY7cNGkcIX+ssQA\nYwLse1NzJ1Cm/bVs14eKX5Xkho3OoJncyp8iEjCoYACsoZB0aj4NgJeP/0ByPMhJ\nAr3ucUP9T++SJTJMS7n8OP+DJxedF/2X9oRLcsY8vYKwLO6lPl6YFYOwC8KZbJP6\n+sdl4o/lDzsMpfmfIbnnD/ixj3TMRCWuZJhTHtsFfL43QbIw7h+/Ka7Yj/gUy9oo\nowIDAQAB\n-----END PUBLIC KEY-----\n	RS256	t	2026-01-09 09:03:05.11+00	2027-01-09 09:03:05.11+00
\.


--
-- Data for Name: knex_migrations; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.knex_migrations (id, name, batch, migration_time) FROM stdin;
1	20251212000000_create_users_table.ts	1	2026-01-09 09:03:02.916+00
2	20251212000001_create_roles_table.ts	1	2026-01-09 09:03:02.977+00
3	20251212000002_create_permissions_table.ts	1	2026-01-09 09:03:03.05+00
4	20251212000003_create_user_roles_table.ts	1	2026-01-09 09:03:03.136+00
5	20251212000004_create_role_permissions_table.ts	1	2026-01-09 09:03:03.198+00
6	20251212000005_add_organization_to_users.ts	1	2026-01-09 09:03:03.362+00
7	20251216_wallet_system.ts	1	2026-01-09 09:03:03.66+00
8	20251229_create_governance_tables.ts	1	2026-01-09 09:03:03.934+00
9	20260109000000_add_enrollment_to_users.ts	1	2026-01-09 09:03:03.971+00
10	20260110000000_add_wallet_type.ts	2	2026-01-10 06:54:29.803+00
11	20260110100000_add_certificate_lifecycle.ts	3	2026-01-13 02:24:43.43+00
\.


--
-- Data for Name: knex_migrations_lock; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.knex_migrations_lock (index, is_locked) FROM stdin;
1	0
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.organizations (id, name, msp_id, domain, ca_url, description, is_active, created_at, updated_at) FROM stdin;
ff3fcb04-ba39-40dc-bfd2-629610415c17	IBN	IBNMSP	ibn.ictu.edu.vn	http://ca.ibn.ictu.edu.vn:7054	ICTU Blockchain Network Organization	t	2026-01-09 09:03:04.402106+00	2026-01-09 09:03:04.402106+00
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.permissions (id, name, resource, action, description, created_at) FROM stdin;
261e908b-f9a7-49aa-8248-6d88e9a1344d	users:create	users	create	Create new users	2026-01-13 07:05:40.551878+00
c431718a-4488-480a-abc8-c15dd96aeae7	users:read	users	read	View user details	2026-01-13 07:05:40.551878+00
85096b90-763e-4f16-9e0d-d8e6a25672ff	users:update	users	update	Update user information	2026-01-13 07:05:40.551878+00
38dadc53-cf85-4070-a955-aae275a17e41	users:delete	users	delete	Delete users	2026-01-13 07:05:40.551878+00
96cde400-8bcb-46cf-9b6e-1c4540e0bb8a	users:list	users	list	List all users	2026-01-13 07:05:40.551878+00
262ace79-9b62-42da-914b-faa39ac58d97	roles:create	roles	create	Create new roles	2026-01-13 07:05:40.551878+00
0ac4600d-bae5-4345-9fa1-ab6c5ab79ec9	roles:read	roles	read	View role details	2026-01-13 07:05:40.551878+00
1967e5e8-b0ad-4a4c-a0c8-2729f5ab4b4c	roles:update	roles	update	Update role information	2026-01-13 07:05:40.551878+00
345a08c5-6a78-439a-b27e-d4dc335626af	roles:delete	roles	delete	Delete roles	2026-01-13 07:05:40.551878+00
66151ae0-670d-490b-a811-e42d565c1597	roles:list	roles	list	List all roles	2026-01-13 07:05:40.551878+00
3fcde97a-05c1-43d0-a25f-1c669ed8485b	roles:assign	roles	assign	Assign roles to users	2026-01-13 07:05:40.551878+00
37b551e8-5cbd-478b-b6bd-6d25ddc5988e	permissions:create	permissions	create	Create new permissions	2026-01-13 07:05:40.551878+00
89a078d9-94bf-4eb9-8a41-b7f5efa365f8	permissions:read	permissions	read	View permission details	2026-01-13 07:05:40.551878+00
1e7dfa04-6865-4509-9c28-1a2d59a361ce	permissions:update	permissions	update	Update permissions	2026-01-13 07:05:40.551878+00
17fd2cd6-25ee-4f80-8d12-80d6b8b289da	permissions:delete	permissions	delete	Delete permissions	2026-01-13 07:05:40.551878+00
06bd29cc-e6f1-40fd-905c-ffdea7373a1e	permissions:list	permissions	list	List all permissions	2026-01-13 07:05:40.551878+00
61c053f0-2c81-4405-8307-002885d8be57	permissions:grant	permissions	grant	Grant permissions to roles	2026-01-13 07:05:40.551878+00
691ab1e7-ce0e-4f68-bfd5-68979bb90a4c	organizations:create	organizations	create	Create new organizations	2026-01-13 07:05:40.551878+00
34973bd9-5eb0-4fb0-b7a8-44c2d8f298fa	organizations:read	organizations	read	View organization details	2026-01-13 07:05:40.551878+00
b7e5261f-379c-41e6-8640-523ed6c3cf92	organizations:update	organizations	update	Update organization information	2026-01-13 07:05:40.551878+00
3896b26d-7c62-43c2-a468-61426704e2b5	organizations:delete	organizations	delete	Delete organizations	2026-01-13 07:05:40.551878+00
55f3c8c9-0eec-4ccf-971f-3db5cb780249	organizations:list	organizations	list	List all organizations	2026-01-13 07:05:40.551878+00
ac39fffb-7e42-4d88-9e15-88d35f3a2847	organizations:activate	organizations	activate	Activate organization	2026-01-13 07:05:40.551878+00
52a8615f-83d3-4df7-ba84-a535c2e3bbd9	organizations:deactivate	organizations	deactivate	Deactivate organization	2026-01-13 07:05:40.551878+00
1d3f99e9-3811-43a6-9f5f-3fe904970cdb	channels:create	channels	create	Create new channels	2026-01-13 07:05:40.551878+00
1dd2a138-5e20-4407-a903-245f20b6ffc8	channels:read	channels	read	View channel details	2026-01-13 07:05:40.551878+00
034cb568-5a0a-4da8-aaa9-54bd09a335d5	channels:update	channels	update	Update channel configuration	2026-01-13 07:05:40.551878+00
69d0be73-c1ba-4e77-b00e-20ccd83731f1	channels:delete	channels	delete	Delete channels	2026-01-13 07:05:40.551878+00
ea77d710-21ce-47cf-be8e-28362c8941fe	channels:list	channels	list	List all channels	2026-01-13 07:05:40.551878+00
b13411d4-85d1-4adb-920f-30d2a0360643	channels:join	channels	join	Join organization to channel	2026-01-13 07:05:40.551878+00
7b6264f1-99c8-4511-bd70-037b21ae878f	chaincodes:create	chaincodes	create	Create/package chaincode	2026-01-13 07:05:40.551878+00
a51c7544-0cbe-457d-b865-d289738fcc2f	chaincodes:read	chaincodes	read	View chaincode details	2026-01-13 07:05:40.551878+00
726292b4-bd79-4a5a-be8e-aad5da95de51	chaincodes:update	chaincodes	update	Update chaincode	2026-01-13 07:05:40.551878+00
c5b5fa01-6fab-4ee2-9c2e-2eb42ce8527e	chaincodes:delete	chaincodes	delete	Delete chaincode	2026-01-13 07:05:40.551878+00
136a5ed8-2050-4b92-8040-9f552862666e	chaincodes:list	chaincodes	list	List all chaincodes	2026-01-13 07:05:40.551878+00
814f384d-5d24-489f-b0ad-2a9f7f38f448	chaincodes:install	chaincodes	install	Install chaincode on peers	2026-01-13 07:05:40.551878+00
d31d968d-081a-4f84-b09c-46213ab0b408	chaincodes:approve	chaincodes	approve	Approve chaincode definition	2026-01-13 07:05:40.551878+00
9a044794-391a-4774-8a52-f07cd895ef42	chaincodes:commit	chaincodes	commit	Commit chaincode to channel	2026-01-13 07:05:40.551878+00
c91c844d-224a-4d92-8136-f8fb36921b4b	chaincodes:query	chaincodes	query	Query chaincode (read-only)	2026-01-13 07:05:40.551878+00
b300a685-fc15-418c-ab5c-3e334554e0e4	chaincodes:invoke	chaincodes	invoke	Invoke chaincode (write operation)	2026-01-13 07:05:40.551878+00
72e1058a-4fe5-4fec-a923-c7bd23c9cc35	blocks:read	blocks	read	View block details	2026-01-13 07:05:40.551878+00
cc4766f8-03d1-455b-9d2b-d3fc15745395	blocks:list	blocks	list	List blocks in channel	2026-01-13 07:05:40.551878+00
b68b074a-2573-431d-8f23-d3b07399635f	transactions:read	transactions	read	View transaction details	2026-01-13 07:05:40.551878+00
de53e248-4b5f-4239-bcea-2c60449ec94e	transactions:list	transactions	list	List transactions	2026-01-13 07:05:40.551878+00
1f001e5b-39f0-4aaf-b8dc-5b7fde937da5	transactions:submit	transactions	submit	Submit new transactions	2026-01-13 07:05:40.551878+00
2368b397-1965-471e-b85c-18a8bc4d799c	certificates:create	certificates	create	Generate new certificates	2026-01-13 07:05:40.551878+00
73567400-210d-473e-b015-9802ef2938d1	certificates:read	certificates	read	View certificate details	2026-01-13 07:05:40.551878+00
cd0b25f5-7dff-459f-bb25-5aa81f93b635	certificates:list	certificates	list	List certificates	2026-01-13 07:05:40.551878+00
ee624392-d378-4551-9fc4-6a48c1c2a0b0	certificates:revoke	certificates	revoke	Revoke certificates	2026-01-13 07:05:40.551878+00
ba70a0a2-3fdb-48d4-9f39-c0bbbbbb6fc7	audit_logs:read	audit_logs	read	View audit logs	2026-01-13 07:05:40.551878+00
d1d6e3e7-5a20-4386-8a76-a46f3e72b95e	audit_logs:list	audit_logs	list	List audit logs	2026-01-13 07:05:40.551878+00
2fdffa57-2fcc-4a80-98e5-95a3ba84176c	system:read	system	read	View system information	2026-01-13 07:05:40.551878+00
d612983f-c525-4f54-b12e-3ec484541567	system:configure	system	configure	Configure system settings	2026-01-13 07:05:40.551878+00
0d987af4-9c60-4097-bd55-4016f75aa18a	system:health	system	health	View system health status	2026-01-13 07:05:40.551878+00
\.


--
-- Data for Name: platform_policies; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.platform_policies (policy_id, policy_name, policy_type, rules, applies_to, is_active, version, created_by, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.role_permissions (id, role_id, permission_id, granted_by, granted_at) FROM stdin;
5983c525-8c44-4d94-a2eb-03b7c5cb2dc2	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	261e908b-f9a7-49aa-8248-6d88e9a1344d	\N	2026-01-13 07:05:40.850382+00
e625b194-5f32-429f-a8e1-956472b67c49	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	c431718a-4488-480a-abc8-c15dd96aeae7	\N	2026-01-13 07:05:40.850382+00
84186243-eae2-407f-ba1d-fa2af85b8196	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	85096b90-763e-4f16-9e0d-d8e6a25672ff	\N	2026-01-13 07:05:40.850382+00
c3247732-1cf2-44ff-8f52-7dba467aee7b	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	38dadc53-cf85-4070-a955-aae275a17e41	\N	2026-01-13 07:05:40.850382+00
b7dfb376-3ce3-4dad-8be8-7d32bfbe45a7	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	96cde400-8bcb-46cf-9b6e-1c4540e0bb8a	\N	2026-01-13 07:05:40.850382+00
a9dc1ff4-166e-4d3b-9dcc-84f85181ce0d	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	262ace79-9b62-42da-914b-faa39ac58d97	\N	2026-01-13 07:05:40.850382+00
0f86ed8a-e096-4e7e-8f4a-1fc86f359436	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	0ac4600d-bae5-4345-9fa1-ab6c5ab79ec9	\N	2026-01-13 07:05:40.850382+00
3e414cbe-19a2-4300-b34b-33e63f5b60cf	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	1967e5e8-b0ad-4a4c-a0c8-2729f5ab4b4c	\N	2026-01-13 07:05:40.850382+00
4da98dc8-771b-4ffc-93de-1d8fb6d68d10	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	345a08c5-6a78-439a-b27e-d4dc335626af	\N	2026-01-13 07:05:40.850382+00
ba1ac8da-5ab2-4ece-876f-0535476789a0	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	66151ae0-670d-490b-a811-e42d565c1597	\N	2026-01-13 07:05:40.850382+00
8c944a62-0fbc-4d0d-90d6-fa43c7963865	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	3fcde97a-05c1-43d0-a25f-1c669ed8485b	\N	2026-01-13 07:05:40.850382+00
42c4005f-4bd7-4c86-aa8b-4465a16e9af0	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	37b551e8-5cbd-478b-b6bd-6d25ddc5988e	\N	2026-01-13 07:05:40.850382+00
4744f606-9cb2-4e2d-9730-eb67867fc04e	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	89a078d9-94bf-4eb9-8a41-b7f5efa365f8	\N	2026-01-13 07:05:40.850382+00
43fe8067-f021-4e7c-8c84-b85c16ca47e7	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	1e7dfa04-6865-4509-9c28-1a2d59a361ce	\N	2026-01-13 07:05:40.850382+00
bc3e78d0-85a1-4f26-9141-d30a6f199a3c	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	17fd2cd6-25ee-4f80-8d12-80d6b8b289da	\N	2026-01-13 07:05:40.850382+00
912bdc9c-c8d0-4535-9e86-4425cead4882	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	06bd29cc-e6f1-40fd-905c-ffdea7373a1e	\N	2026-01-13 07:05:40.850382+00
de1e9df3-8a1d-4b6c-a718-866f94ed45ad	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	61c053f0-2c81-4405-8307-002885d8be57	\N	2026-01-13 07:05:40.850382+00
a48903c8-b6f1-40bb-a886-586e69269470	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	691ab1e7-ce0e-4f68-bfd5-68979bb90a4c	\N	2026-01-13 07:05:40.850382+00
f681bae0-5deb-4cb6-aa76-c2bdf753f402	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	34973bd9-5eb0-4fb0-b7a8-44c2d8f298fa	\N	2026-01-13 07:05:40.850382+00
a713fd22-2d25-4ad5-a691-266799992bc6	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	b7e5261f-379c-41e6-8640-523ed6c3cf92	\N	2026-01-13 07:05:40.850382+00
97437f7d-6ba2-439c-9bda-97c0d5360fe1	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	3896b26d-7c62-43c2-a468-61426704e2b5	\N	2026-01-13 07:05:40.850382+00
5a3c7089-e88e-4f1a-afdc-39e04a023716	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	55f3c8c9-0eec-4ccf-971f-3db5cb780249	\N	2026-01-13 07:05:40.850382+00
253936c4-de2d-4c50-aa2e-9348583ce986	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	ac39fffb-7e42-4d88-9e15-88d35f3a2847	\N	2026-01-13 07:05:40.850382+00
8a12984b-e90e-4eda-943b-13dc8c8361d8	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	52a8615f-83d3-4df7-ba84-a535c2e3bbd9	\N	2026-01-13 07:05:40.850382+00
72ef77a1-ec48-474a-9167-f72b37aae0b1	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	1d3f99e9-3811-43a6-9f5f-3fe904970cdb	\N	2026-01-13 07:05:40.850382+00
68521887-384c-4a53-be45-9a426318e6fb	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	1dd2a138-5e20-4407-a903-245f20b6ffc8	\N	2026-01-13 07:05:40.850382+00
6e5f6188-ed73-4cc0-8b42-90658405814b	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	034cb568-5a0a-4da8-aaa9-54bd09a335d5	\N	2026-01-13 07:05:40.850382+00
a0e0032f-c27e-4b29-a6a5-9d4551b31ad4	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	69d0be73-c1ba-4e77-b00e-20ccd83731f1	\N	2026-01-13 07:05:40.850382+00
487a9c43-c8d4-4b29-93d0-a770a6dd8953	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	ea77d710-21ce-47cf-be8e-28362c8941fe	\N	2026-01-13 07:05:40.850382+00
b6b082d2-8057-4947-8d20-06408b0fab03	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	b13411d4-85d1-4adb-920f-30d2a0360643	\N	2026-01-13 07:05:40.850382+00
e58e7f21-3bc4-4d91-a84f-1b181670eb3b	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	7b6264f1-99c8-4511-bd70-037b21ae878f	\N	2026-01-13 07:05:40.850382+00
452ddb71-7428-40a7-836c-222202ff5b15	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	a51c7544-0cbe-457d-b865-d289738fcc2f	\N	2026-01-13 07:05:40.850382+00
0ff56b9d-bc55-4d6d-90d1-9ae4646e3d5f	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	726292b4-bd79-4a5a-be8e-aad5da95de51	\N	2026-01-13 07:05:40.850382+00
68c33958-700f-4cd1-8c5f-c3f90476f132	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	c5b5fa01-6fab-4ee2-9c2e-2eb42ce8527e	\N	2026-01-13 07:05:40.850382+00
77f3a94c-f731-4ed8-92a9-2eed706d68ad	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	136a5ed8-2050-4b92-8040-9f552862666e	\N	2026-01-13 07:05:40.850382+00
01c6c713-79ca-41bf-870e-d6cf943a6f0e	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	814f384d-5d24-489f-b0ad-2a9f7f38f448	\N	2026-01-13 07:05:40.850382+00
7326832e-c252-4005-88fc-a1b92d323f24	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	d31d968d-081a-4f84-b09c-46213ab0b408	\N	2026-01-13 07:05:40.850382+00
a72de2b8-cbfe-4093-a4d4-6896739e45e2	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	9a044794-391a-4774-8a52-f07cd895ef42	\N	2026-01-13 07:05:40.850382+00
c425f9f0-6603-4e0e-80f6-101ec38b1396	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	c91c844d-224a-4d92-8136-f8fb36921b4b	\N	2026-01-13 07:05:40.850382+00
9af6e1d2-707a-4304-892a-ea2e2ab7b08c	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	b300a685-fc15-418c-ab5c-3e334554e0e4	\N	2026-01-13 07:05:40.850382+00
43fbaa7b-00f6-43bb-93dc-6a33287fe7e3	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	72e1058a-4fe5-4fec-a923-c7bd23c9cc35	\N	2026-01-13 07:05:40.850382+00
4b0209bd-cfae-432f-8b1a-f7165d755288	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	cc4766f8-03d1-455b-9d2b-d3fc15745395	\N	2026-01-13 07:05:40.850382+00
b800c732-5f01-453b-898e-47f6a2742b46	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	b68b074a-2573-431d-8f23-d3b07399635f	\N	2026-01-13 07:05:40.850382+00
ce107ee0-f8be-43a5-a320-c70d38d8eb0b	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	de53e248-4b5f-4239-bcea-2c60449ec94e	\N	2026-01-13 07:05:40.850382+00
441a85cd-f94d-4bd3-8707-f6e918afcabb	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	1f001e5b-39f0-4aaf-b8dc-5b7fde937da5	\N	2026-01-13 07:05:40.850382+00
6ada43c7-19b9-4fdb-bd0b-4a30f9a3bb24	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	2368b397-1965-471e-b85c-18a8bc4d799c	\N	2026-01-13 07:05:40.850382+00
7734296c-29bc-41f7-aa63-7dc87a4d4a75	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	73567400-210d-473e-b015-9802ef2938d1	\N	2026-01-13 07:05:40.850382+00
8cb96bed-6bcd-4bc5-a8b4-2efd17ae9e90	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	cd0b25f5-7dff-459f-bb25-5aa81f93b635	\N	2026-01-13 07:05:40.850382+00
86c8f995-1dfe-4ae7-b0ec-2cedf10f70ef	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	ee624392-d378-4551-9fc4-6a48c1c2a0b0	\N	2026-01-13 07:05:40.850382+00
e508299e-efbf-4d68-8730-62f20d56c637	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	ba70a0a2-3fdb-48d4-9f39-c0bbbbbb6fc7	\N	2026-01-13 07:05:40.850382+00
d02caaea-82c0-4a3c-a1ff-d19335edc261	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	d1d6e3e7-5a20-4386-8a76-a46f3e72b95e	\N	2026-01-13 07:05:40.850382+00
fcfdb819-efea-4191-ab18-d04ad50cadd2	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	2fdffa57-2fcc-4a80-98e5-95a3ba84176c	\N	2026-01-13 07:05:40.850382+00
1efc74a9-3669-4b7f-80ab-cf4e8a2cd54c	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	d612983f-c525-4f54-b12e-3ec484541567	\N	2026-01-13 07:05:40.850382+00
d067cf6f-38c5-4bbe-b45f-addfafce5dfa	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	0d987af4-9c60-4097-bd55-4016f75aa18a	\N	2026-01-13 07:05:40.850382+00
5e9fc3c9-541d-4740-9de4-d6d4c4c48200	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	261e908b-f9a7-49aa-8248-6d88e9a1344d	\N	2026-01-13 07:05:40.850382+00
1a2f09f1-ba71-40c7-a30f-a2a9a3cc292a	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	c431718a-4488-480a-abc8-c15dd96aeae7	\N	2026-01-13 07:05:40.850382+00
df3454fb-56cc-4105-b242-311c6e3bece0	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	85096b90-763e-4f16-9e0d-d8e6a25672ff	\N	2026-01-13 07:05:40.850382+00
3d03a794-4a0f-41ab-9ac6-09cab1159f1b	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	38dadc53-cf85-4070-a955-aae275a17e41	\N	2026-01-13 07:05:40.850382+00
70aa19bd-5500-4d84-a6e1-fd1e72c58ee6	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	96cde400-8bcb-46cf-9b6e-1c4540e0bb8a	\N	2026-01-13 07:05:40.850382+00
d0826836-cb22-4a9f-958c-d6caedc620f8	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	0ac4600d-bae5-4345-9fa1-ab6c5ab79ec9	\N	2026-01-13 07:05:40.850382+00
617d0492-63ec-427e-a5fe-a28956f0653f	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	66151ae0-670d-490b-a811-e42d565c1597	\N	2026-01-13 07:05:40.850382+00
5f2698ec-2a1d-4070-b258-df3e96b9f221	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	3fcde97a-05c1-43d0-a25f-1c669ed8485b	\N	2026-01-13 07:05:40.850382+00
19e132de-ed11-4e4c-ac4f-8325065b0b3f	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	34973bd9-5eb0-4fb0-b7a8-44c2d8f298fa	\N	2026-01-13 07:05:40.850382+00
3a59fdb2-71c8-4101-9d7f-12db13278be7	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	b7e5261f-379c-41e6-8640-523ed6c3cf92	\N	2026-01-13 07:05:40.850382+00
432526a0-b6d3-4a16-b721-30b9f14b2df3	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	ac39fffb-7e42-4d88-9e15-88d35f3a2847	\N	2026-01-13 07:05:40.850382+00
89f3e237-72c6-46ec-857f-ae64e20d017e	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	52a8615f-83d3-4df7-ba84-a535c2e3bbd9	\N	2026-01-13 07:05:40.850382+00
a4f3a2f8-6e45-46db-896b-1c233ee1a5ae	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	1d3f99e9-3811-43a6-9f5f-3fe904970cdb	\N	2026-01-13 07:05:40.850382+00
4515f958-bb42-4555-8c34-73de87de1a6c	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	1dd2a138-5e20-4407-a903-245f20b6ffc8	\N	2026-01-13 07:05:40.850382+00
d87c2bff-bf47-46a1-8c98-c1d0de0f1524	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	034cb568-5a0a-4da8-aaa9-54bd09a335d5	\N	2026-01-13 07:05:40.850382+00
a0ab7f36-48ec-4a03-b4d0-0be48b24fed8	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	69d0be73-c1ba-4e77-b00e-20ccd83731f1	\N	2026-01-13 07:05:40.850382+00
85d828d2-f362-4464-97ab-51f4a12905a8	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	ea77d710-21ce-47cf-be8e-28362c8941fe	\N	2026-01-13 07:05:40.850382+00
f652a2e1-a3ac-41e6-9328-67a68e632150	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	b13411d4-85d1-4adb-920f-30d2a0360643	\N	2026-01-13 07:05:40.850382+00
cd58d79e-23e1-44a6-b06d-621d0c0bb4b5	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	7b6264f1-99c8-4511-bd70-037b21ae878f	\N	2026-01-13 07:05:40.850382+00
a1c52669-9b12-421b-acd9-916935ba904f	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	a51c7544-0cbe-457d-b865-d289738fcc2f	\N	2026-01-13 07:05:40.850382+00
d5cc8e8b-95b4-46ab-a097-ceb82346ee12	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	726292b4-bd79-4a5a-be8e-aad5da95de51	\N	2026-01-13 07:05:40.850382+00
85d05aa7-d9ee-4b10-96c1-899fbf466d5d	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	c5b5fa01-6fab-4ee2-9c2e-2eb42ce8527e	\N	2026-01-13 07:05:40.850382+00
57ef78b7-0e4a-489b-9d4a-f51504e36487	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	136a5ed8-2050-4b92-8040-9f552862666e	\N	2026-01-13 07:05:40.850382+00
ff97bbfd-8817-4d70-a7ea-cd54e53c2249	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	814f384d-5d24-489f-b0ad-2a9f7f38f448	\N	2026-01-13 07:05:40.850382+00
9d294964-4af6-4b47-bc20-1eb6e1f9fc36	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	d31d968d-081a-4f84-b09c-46213ab0b408	\N	2026-01-13 07:05:40.850382+00
b7ae5727-147b-4ff6-82b9-4eb71faefcac	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	9a044794-391a-4774-8a52-f07cd895ef42	\N	2026-01-13 07:05:40.850382+00
bc5dd168-ab22-4101-9cfe-53d2ba565507	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	c91c844d-224a-4d92-8136-f8fb36921b4b	\N	2026-01-13 07:05:40.850382+00
f78eb88b-ac16-489b-8a0d-1f9e92a0e2ef	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	b300a685-fc15-418c-ab5c-3e334554e0e4	\N	2026-01-13 07:05:40.850382+00
cc532afc-27be-4e12-90df-b74f12bf5ada	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	72e1058a-4fe5-4fec-a923-c7bd23c9cc35	\N	2026-01-13 07:05:40.850382+00
0e8b90dc-c5e8-4e66-9871-5d5fe75ad9aa	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	cc4766f8-03d1-455b-9d2b-d3fc15745395	\N	2026-01-13 07:05:40.850382+00
ca8a3544-f8a7-4d2e-ad33-0d2f59958143	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	b68b074a-2573-431d-8f23-d3b07399635f	\N	2026-01-13 07:05:40.850382+00
cf0fad5a-e2b7-4977-aa90-88aa031c117d	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	de53e248-4b5f-4239-bcea-2c60449ec94e	\N	2026-01-13 07:05:40.850382+00
8144ef25-e49f-40a6-9f84-1827c3c12762	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	1f001e5b-39f0-4aaf-b8dc-5b7fde937da5	\N	2026-01-13 07:05:40.850382+00
94c1882a-fe1a-4b55-b372-48b7a498e7cf	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	2368b397-1965-471e-b85c-18a8bc4d799c	\N	2026-01-13 07:05:40.850382+00
004a4cf0-b296-44d8-9aa7-371e71a85d17	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	73567400-210d-473e-b015-9802ef2938d1	\N	2026-01-13 07:05:40.850382+00
c7a75cd0-d925-4530-9767-9c8f6fd49c68	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	cd0b25f5-7dff-459f-bb25-5aa81f93b635	\N	2026-01-13 07:05:40.850382+00
2a3953f7-805f-458a-867a-adb3aa11a6bc	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	ba70a0a2-3fdb-48d4-9f39-c0bbbbbb6fc7	\N	2026-01-13 07:05:40.850382+00
2dd94710-0072-49ee-b055-9e7a435188ec	70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	d1d6e3e7-5a20-4386-8a76-a46f3e72b95e	\N	2026-01-13 07:05:40.850382+00
f9743674-295e-488a-875d-7c2fadf716c1	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	c431718a-4488-480a-abc8-c15dd96aeae7	\N	2026-01-13 07:05:40.850382+00
9d20278a-6c78-49b8-8c64-f345dd3441f7	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	34973bd9-5eb0-4fb0-b7a8-44c2d8f298fa	\N	2026-01-13 07:05:40.850382+00
a5525216-a345-40f0-af0f-9419cb16bcfc	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	1dd2a138-5e20-4407-a903-245f20b6ffc8	\N	2026-01-13 07:05:40.850382+00
819dd15e-8fbe-41c3-aeb2-34ad4795c32d	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	ea77d710-21ce-47cf-be8e-28362c8941fe	\N	2026-01-13 07:05:40.850382+00
6d6e2d73-5f1d-4c29-87ae-acdefea5eae3	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	a51c7544-0cbe-457d-b865-d289738fcc2f	\N	2026-01-13 07:05:40.850382+00
d422eba9-e3ed-47eb-b14c-6b474f24b432	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	136a5ed8-2050-4b92-8040-9f552862666e	\N	2026-01-13 07:05:40.850382+00
fc1ef34e-2dc4-4e2e-8ae7-6082444ef9ba	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	c91c844d-224a-4d92-8136-f8fb36921b4b	\N	2026-01-13 07:05:40.850382+00
f38d612b-11fe-47da-ab90-50d277b65388	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	72e1058a-4fe5-4fec-a923-c7bd23c9cc35	\N	2026-01-13 07:05:40.850382+00
ee074e8b-80af-4de0-96db-e43d7320eec3	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	cc4766f8-03d1-455b-9d2b-d3fc15745395	\N	2026-01-13 07:05:40.850382+00
de68c242-6e62-4f4b-9994-39c5cb05e6e2	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	b68b074a-2573-431d-8f23-d3b07399635f	\N	2026-01-13 07:05:40.850382+00
b5a5b955-0c77-4181-89f4-93241e82cef1	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	de53e248-4b5f-4239-bcea-2c60449ec94e	\N	2026-01-13 07:05:40.850382+00
ed75c93f-cf50-4e47-9148-3bf3554ec401	2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	73567400-210d-473e-b015-9802ef2938d1	\N	2026-01-13 07:05:40.850382+00
3d3057a2-bb52-4830-bfcc-21ab37eb36b2	1552f3c4-c2d4-48a3-9909-97a2d5e545db	c431718a-4488-480a-abc8-c15dd96aeae7	\N	2026-01-13 07:05:40.850382+00
59bc497e-d521-4431-8646-b4c9f8d00cce	1552f3c4-c2d4-48a3-9909-97a2d5e545db	96cde400-8bcb-46cf-9b6e-1c4540e0bb8a	\N	2026-01-13 07:05:40.850382+00
23bf849e-35df-4542-9d74-855cc3cde65f	1552f3c4-c2d4-48a3-9909-97a2d5e545db	34973bd9-5eb0-4fb0-b7a8-44c2d8f298fa	\N	2026-01-13 07:05:40.850382+00
335adc6c-4d89-4016-a045-78ca8194a395	1552f3c4-c2d4-48a3-9909-97a2d5e545db	55f3c8c9-0eec-4ccf-971f-3db5cb780249	\N	2026-01-13 07:05:40.850382+00
a8bbbeb6-7fcb-4742-8da4-311563a37003	1552f3c4-c2d4-48a3-9909-97a2d5e545db	1dd2a138-5e20-4407-a903-245f20b6ffc8	\N	2026-01-13 07:05:40.850382+00
cfe7b4f0-3464-41b3-a196-62b246695211	1552f3c4-c2d4-48a3-9909-97a2d5e545db	ea77d710-21ce-47cf-be8e-28362c8941fe	\N	2026-01-13 07:05:40.850382+00
e1cfe315-a5c7-4169-876e-19413242e95b	1552f3c4-c2d4-48a3-9909-97a2d5e545db	a51c7544-0cbe-457d-b865-d289738fcc2f	\N	2026-01-13 07:05:40.850382+00
0ca7975b-2b37-4e69-9991-aa05f5271a08	1552f3c4-c2d4-48a3-9909-97a2d5e545db	136a5ed8-2050-4b92-8040-9f552862666e	\N	2026-01-13 07:05:40.850382+00
324314de-0278-496b-ada3-0981a42cf910	1552f3c4-c2d4-48a3-9909-97a2d5e545db	72e1058a-4fe5-4fec-a923-c7bd23c9cc35	\N	2026-01-13 07:05:40.850382+00
081cbeb3-24f9-4ea3-9bde-cef3ad9021a8	1552f3c4-c2d4-48a3-9909-97a2d5e545db	cc4766f8-03d1-455b-9d2b-d3fc15745395	\N	2026-01-13 07:05:40.850382+00
d45d86a8-132d-48e9-a725-3269db12c815	1552f3c4-c2d4-48a3-9909-97a2d5e545db	b68b074a-2573-431d-8f23-d3b07399635f	\N	2026-01-13 07:05:40.850382+00
ef997523-c85d-4b81-ab82-55aadc921bdd	1552f3c4-c2d4-48a3-9909-97a2d5e545db	de53e248-4b5f-4239-bcea-2c60449ec94e	\N	2026-01-13 07:05:40.850382+00
ca0beeec-e7e4-4bfa-9db9-f47e910a1f39	1552f3c4-c2d4-48a3-9909-97a2d5e545db	73567400-210d-473e-b015-9802ef2938d1	\N	2026-01-13 07:05:40.850382+00
38341630-31e4-489b-bbf5-85b81f542c33	1552f3c4-c2d4-48a3-9909-97a2d5e545db	cd0b25f5-7dff-459f-bb25-5aa81f93b635	\N	2026-01-13 07:05:40.850382+00
fe5a9845-fc9a-42f5-818b-319183b25dc4	1552f3c4-c2d4-48a3-9909-97a2d5e545db	ba70a0a2-3fdb-48d4-9f39-c0bbbbbb6fc7	\N	2026-01-13 07:05:40.850382+00
57f556f6-b63f-4262-a273-df26eb6e338d	1552f3c4-c2d4-48a3-9909-97a2d5e545db	d1d6e3e7-5a20-4386-8a76-a46f3e72b95e	\N	2026-01-13 07:05:40.850382+00
ee08c555-5926-42c7-891e-2758f1e8a048	1552f3c4-c2d4-48a3-9909-97a2d5e545db	2fdffa57-2fcc-4a80-98e5-95a3ba84176c	\N	2026-01-13 07:05:40.850382+00
8091852f-164f-42fa-a881-79908a0a0011	1552f3c4-c2d4-48a3-9909-97a2d5e545db	0d987af4-9c60-4097-bd55-4016f75aa18a	\N	2026-01-13 07:05:40.850382+00
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.roles (id, name, description, is_system, created_at, updated_at) FROM stdin;
5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	SuperAdmin	System administrator with full access across all organizations. Bypass all permission checks.	t	2026-01-13 07:05:40.441825+00	2026-01-13 07:05:40.441825+00
70fcab74-96b4-4cd7-a5ae-5fdb84b6f111	OrgAdmin	Organization administrator. Manage users, channels, and chaincodes within own organization.	t	2026-01-13 07:05:40.441825+00	2026-01-13 07:05:40.441825+00
2b481d7d-3c7a-4a56-8cd2-e8c6de2d90b0	User	Standard user with limited access. Query chaincodes and view blocks within own organization.	t	2026-01-13 07:05:40.441825+00	2026-01-13 07:05:40.441825+00
1552f3c4-c2d4-48a3-9909-97a2d5e545db	Auditor	Read-only auditor with cross-organization view capability for compliance and auditing.	t	2026-01-13 07:05:40.441825+00	2026-01-13 07:05:40.441825+00
\.


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.user_roles (id, user_id, role_id, assigned_by, assigned_at, expires_at) FROM stdin;
373c7d06-7df1-4bbc-9fa0-7db0afbcb21a	598272f9-26e6-4098-9b54-e3e2ee43d65a	5ecacbd6-7a73-4a0b-89c1-7b08bfbda8b0	\N	2026-01-13 07:05:41.003895+00	\N
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.users (id, username, email, password_hash, role, is_active, created_at, updated_at, organization_id, wallet_id, certificate_serial, enrolled, enrollment_secret, enrolled_at, is_enrolled, fabric_identity_id) FROM stdin;
598272f9-26e6-4098-9b54-e3e2ee43d65a	admin	admin@ibn.local	$2a$10$UkrgoAuYtEQrZpD0kAVVMumIcikNadM5gnH2pPplhHTDnWp.b7H0a	SuperAdmin	t	2026-01-09 09:03:04.979017+00	2026-01-13 07:05:40.994681+00	ff3fcb04-ba39-40dc-bfd2-629610415c17	\N	\N	f	\N	\N	f	\N
8cf975e2-b2a1-4474-9f99-0383a5293456	testuser	test@test.com	$2a$10$3H.79Ap04KOhPFYxYkgB0OzebR2FgaTmpKuvJMEXuWc7f6Y9UfjRm	user	t	2026-01-10 07:05:52.735489+00	2026-01-10 07:05:52.735489+00	ff3fcb04-ba39-40dc-bfd2-629610415c17	testuser@IBNMSP	62:E1:F1:6A:8E:50:37:71:52:E1:96:0F:D9:C5:E4:1B:F9:FB:6C:EF	t	\N	2026-01-10 07:05:54.842496+00	f	\N
\.


--
-- Data for Name: wallets; Type: TABLE DATA; Schema: public; Owner: ibn_user
--

COPY public.wallets (id, label, certificate, private_key, encryption_iv, encryption_tag, msp_id, type, created_at, updated_at, last_used_at, certificate_expires_at, certificate_notified_at, revoked, revoked_at, revocation_reason) FROM stdin;
3a7e0a16-2e52-4353-8908-d589951ce425	admin@ibnmsp	-----BEGIN CERTIFICATE-----\nMIIB6jCCAZGgAwIBAgIUY3Hv26ZoKvoI9fA9ulbF+9PyM8QwCgYIKoZIzj0EAwIw\naDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK\nEwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt\nY2Etc2VydmVyMB4XDTI1MTIzMDAzMTYwMFoXDTI3MDExMDA3MDYwMFowITEPMA0G\nA1UECxMGY2xpZW50MQ4wDAYDVQQDEwVhZG1pbjBZMBMGByqGSM49AgEGCCqGSM49\nAwEHA0IABIb1pv+MraPfH2YtEqV+8THOHAv6PjLm55nhItAk6kKi0uzWdwCOsNnc\nRJCeN/RbUX+bM3oeE3jPZYXUEfCTocGjYDBeMA4GA1UdDwEB/wQEAwIHgDAMBgNV\nHRMBAf8EAjAAMB0GA1UdDgQWBBQJsG/ZNfD5mmIqtsz8iBn7ZQKVdzAfBgNVHSME\nGDAWgBSiKiovuBFY8oFUYgc3WtCr/9FlzTAKBggqhkjOPQQDAgNHADBEAiBcYU0/\n06svodF/hRbqnH8rEixKRzXGkcPGKnqn7BrznQIgUUMxah3+uAvgRYf3bF8KPRN2\nXclWl6pOg7F5SfOEYlo=\n-----END CERTIFICATE-----\n	YcrT5wy0lRf+lcSe8pFpf8Qf2UmB/pr+/VNkoXFJdf4YqOG4rTwsYSvUGfpx/YHha7m3nsmVqG4QnBGG3r9GiJX4r9NNckPJm4ygt9MlmIIFrS3Zpz7YDd8t9lYwbrcRjLtAil267Na6uDOOuE3plE5DS4X/Rjx1ISFAa6tHLpB+TtvazX4xg3g+VM/mzKvQwddwt5+P5vHfS66ivXhbeeiGhKDG7xRvlPw5jd2FUEev71kuCO9Zh/M0X3mMdss9X0bRMunMmx70h0fGpsSJ9v6TzPBTJZiAx5ceawlY087tT4yrLyPhEHAXYlsTibnAWfGT3LcH	inwLqrBZLpKjHIV/	kV/mzGZbfU5BP4j1JnWTRw==	IBNMSP	admin	2026-01-10 07:05:54.51+00	2026-01-13 02:44:05.866+00	2026-01-10 07:05:54.531+00	2027-01-10 07:06:00+00	\N	f	\N	\N
d850118d-e5c8-4411-afce-47620d040f7d	testuser@ibnmsp	-----BEGIN CERTIFICATE-----\nMIICTTCCAfOgAwIBAgIUYuHxao5QN3FS4ZYP2cXkG/n7bO8wCgYIKoZIzj0EAwIw\naDELMAkGA1UEBhMCVVMxFzAVBgNVBAgTDk5vcnRoIENhcm9saW5hMRQwEgYDVQQK\nEwtIeXBlcmxlZGdlcjEPMA0GA1UECxMGRmFicmljMRkwFwYDVQQDExBmYWJyaWMt\nY2Etc2VydmVyMB4XDTI1MTIzMDAzMTYwMFoXDTI3MDExMDA3MDYwMFowJDEPMA0G\nA1UECxMGY2xpZW50MREwDwYDVQQDEwh0ZXN0dXNlcjBZMBMGByqGSM49AgEGCCqG\nSM49AwEHA0IABJrZZHQYfBxkL/2hyBD0WdOxiwFqVf9jYdq4pXn/YKHDSTgPBvzg\nO6m8cPgZD3UYAXGAafYukjxVK7+yKJwht3ijgb4wgbswDgYDVR0PAQH/BAQDAgeA\nMAwGA1UdEwEB/wQCMAAwHQYDVR0OBBYEFPCggtVLWUDDonmy6EdpKo4of5sPMB8G\nA1UdIwQYMBaAFKIqKi+4EVjygVRiBzda0Kv/0WXNMFsGCCoDBAUGBwgBBE97ImF0\ndHJzIjp7ImhmLkFmZmlsaWF0aW9uIjoiIiwiaGYuRW5yb2xsbWVudElEIjoidGVz\ndHVzZXIiLCJoZi5UeXBlIjoiY2xpZW50In19MAoGCCqGSM49BAMCA0gAMEUCIQDm\nG720xvvJqb81KqQAbzAnI5YD8JesORCBOVsOx86+0wIgcrGEcKpUHESNk2S4Nn90\n2e9cDEWDi0YlL3E2dA9YPyA=\n-----END CERTIFICATE-----\n	tAxgqMqo3kZeHNqjO/Jro1baHeBNMpmYZ1jjrTlf5YpopRJnOPbqekd8GJOjYfg+J0wYczryHLDAtp37wn0+xFuc+RGN8tMHX1BuDgLHzIXvWLZ11GBh5jDbAASqeoUTL1E40PqDs8+cpfUFgSSGdvhlvL6c1BS/9/g8LU4PNp9XlII8eLoRYDH6vYI+inIGeP/QIotsvcQYyhh0K2fv0hIlrAdF85jUvB1WUuTkffIYwmqhdrHWd2lq4Pd/vuWbPasSCD/uYNrOc6ayVtvSVw/QCLUY+z9ZwLZbQZWoJ4TUFmspmATTnjo6zNg6ksflyR3AcGBT	Ff/j5hHwQXKI2yxk	a7GiQ2UpBxI48xJdftj2Mg==	IBNMSP	X.509	2026-01-10 07:05:54.838+00	2026-01-13 02:44:05.876+00	\N	2027-01-10 07:06:00+00	\N	f	\N	\N
\.


--
-- Name: knex_migrations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: ibn_user
--

SELECT pg_catalog.setval('public.knex_migrations_id_seq', 11, true);


--
-- Name: knex_migrations_lock_index_seq; Type: SEQUENCE SET; Schema: public; Owner: ibn_user
--

SELECT pg_catalog.setval('public.knex_migrations_lock_index_seq', 1, true);


--
-- Name: audit_events_cache audit_events_cache_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.audit_events_cache
    ADD CONSTRAINT audit_events_cache_pkey PRIMARY KEY (event_id);


--
-- Name: certificate_revocations certificate_revocations_certificate_serial_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.certificate_revocations
    ADD CONSTRAINT certificate_revocations_certificate_serial_unique UNIQUE (certificate_serial);


--
-- Name: certificate_revocations certificate_revocations_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.certificate_revocations
    ADD CONSTRAINT certificate_revocations_pkey PRIMARY KEY (id);


--
-- Name: chaincode_proposals chaincode_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.chaincode_proposals
    ADD CONSTRAINT chaincode_proposals_pkey PRIMARY KEY (proposal_id);


--
-- Name: channel_configs channel_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.channel_configs
    ADD CONSTRAINT channel_configs_pkey PRIMARY KEY (channel_id);


--
-- Name: jwt_keys jwt_keys_key_id_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.jwt_keys
    ADD CONSTRAINT jwt_keys_key_id_unique UNIQUE (key_id);


--
-- Name: jwt_keys jwt_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.jwt_keys
    ADD CONSTRAINT jwt_keys_pkey PRIMARY KEY (id);


--
-- Name: knex_migrations_lock knex_migrations_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.knex_migrations_lock
    ADD CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (index);


--
-- Name: knex_migrations knex_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.knex_migrations
    ADD CONSTRAINT knex_migrations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_msp_id_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_msp_id_unique UNIQUE (msp_id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_name_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_name_unique UNIQUE (name);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: platform_policies platform_policies_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.platform_policies
    ADD CONSTRAINT platform_policies_pkey PRIMARY KEY (policy_id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_unique UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: permissions uq_permissions_resource_action; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT uq_permissions_resource_action UNIQUE (resource, action);


--
-- Name: role_permissions uq_role_permissions; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT uq_role_permissions UNIQUE (role_id, permission_id);


--
-- Name: user_roles uq_user_roles; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT uq_user_roles UNIQUE (user_id, role_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: users users_wallet_id_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_wallet_id_unique UNIQUE (wallet_id);


--
-- Name: wallets wallets_label_unique; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_label_unique UNIQUE (label);


--
-- Name: wallets wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_pkey PRIMARY KEY (id);


--
-- Name: audit_events_cache_actor_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX audit_events_cache_actor_index ON public.audit_events_cache USING btree (actor);


--
-- Name: audit_events_cache_event_type_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX audit_events_cache_event_type_index ON public.audit_events_cache USING btree (event_type);


--
-- Name: audit_events_cache_resource_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX audit_events_cache_resource_index ON public.audit_events_cache USING btree (resource);


--
-- Name: audit_events_cache_status_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX audit_events_cache_status_index ON public.audit_events_cache USING btree (status);


--
-- Name: audit_events_cache_timestamp_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX audit_events_cache_timestamp_index ON public.audit_events_cache USING btree ("timestamp");


--
-- Name: chaincode_proposals_chaincode_name_version_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX chaincode_proposals_chaincode_name_version_index ON public.chaincode_proposals USING btree (chaincode_name, version);


--
-- Name: chaincode_proposals_created_at_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX chaincode_proposals_created_at_index ON public.chaincode_proposals USING btree (created_at);


--
-- Name: chaincode_proposals_proposed_by_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX chaincode_proposals_proposed_by_index ON public.chaincode_proposals USING btree (proposed_by);


--
-- Name: chaincode_proposals_status_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX chaincode_proposals_status_index ON public.chaincode_proposals USING btree (status);


--
-- Name: channel_configs_created_at_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX channel_configs_created_at_index ON public.channel_configs USING btree (created_at);


--
-- Name: channel_configs_status_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX channel_configs_status_index ON public.channel_configs USING btree (status);


--
-- Name: idx_cert_revocations_date; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_cert_revocations_date ON public.certificate_revocations USING btree (revoked_at);


--
-- Name: idx_cert_revocations_serial; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_cert_revocations_serial ON public.certificate_revocations USING btree (certificate_serial);


--
-- Name: idx_cert_revocations_wallet; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_cert_revocations_wallet ON public.certificate_revocations USING btree (wallet_id);


--
-- Name: idx_jwt_keys_active; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_jwt_keys_active ON public.jwt_keys USING btree (is_active);


--
-- Name: idx_jwt_keys_expires; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_jwt_keys_expires ON public.jwt_keys USING btree (expires_at);


--
-- Name: idx_jwt_keys_key_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_jwt_keys_key_id ON public.jwt_keys USING btree (key_id);


--
-- Name: idx_organizations_is_active; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_organizations_is_active ON public.organizations USING btree (is_active);


--
-- Name: idx_organizations_msp_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_organizations_msp_id ON public.organizations USING btree (msp_id);


--
-- Name: idx_permissions_action; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_permissions_action ON public.permissions USING btree (action);


--
-- Name: idx_permissions_resource; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_permissions_resource ON public.permissions USING btree (resource);


--
-- Name: idx_role_permissions_permission_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_role_permissions_permission_id ON public.role_permissions USING btree (permission_id);


--
-- Name: idx_role_permissions_role_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_role_permissions_role_id ON public.role_permissions USING btree (role_id);


--
-- Name: idx_roles_name; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_roles_name ON public.roles USING btree (name);


--
-- Name: idx_user_roles_expires_at; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_user_roles_expires_at ON public.user_roles USING btree (expires_at);


--
-- Name: idx_user_roles_role_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_user_roles_role_id ON public.user_roles USING btree (role_id);


--
-- Name: idx_user_roles_user_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id);


--
-- Name: idx_users_certificate_serial; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_users_certificate_serial ON public.users USING btree (certificate_serial);


--
-- Name: idx_users_enrolled; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_users_enrolled ON public.users USING btree (enrolled);


--
-- Name: idx_users_organization_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_users_organization_id ON public.users USING btree (organization_id);


--
-- Name: idx_users_wallet_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_users_wallet_id ON public.users USING btree (wallet_id);


--
-- Name: idx_wallets_expiry; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_wallets_expiry ON public.wallets USING btree (certificate_expires_at) WHERE (certificate_expires_at IS NOT NULL);


--
-- Name: idx_wallets_label; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_wallets_label ON public.wallets USING btree (label);


--
-- Name: idx_wallets_last_used; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_wallets_last_used ON public.wallets USING btree (last_used_at);


--
-- Name: idx_wallets_msp_id; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_wallets_msp_id ON public.wallets USING btree (msp_id);


--
-- Name: idx_wallets_revoked; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX idx_wallets_revoked ON public.wallets USING btree (revoked) WHERE (revoked = true);


--
-- Name: platform_policies_created_at_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX platform_policies_created_at_index ON public.platform_policies USING btree (created_at);


--
-- Name: platform_policies_is_active_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX platform_policies_is_active_index ON public.platform_policies USING btree (is_active);


--
-- Name: platform_policies_policy_type_index; Type: INDEX; Schema: public; Owner: ibn_user
--

CREATE INDEX platform_policies_policy_type_index ON public.platform_policies USING btree (policy_type);


--
-- Name: certificate_revocations certificate_revocations_revoked_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.certificate_revocations
    ADD CONSTRAINT certificate_revocations_revoked_by_foreign FOREIGN KEY (revoked_by) REFERENCES public.users(id);


--
-- Name: certificate_revocations certificate_revocations_wallet_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.certificate_revocations
    ADD CONSTRAINT certificate_revocations_wallet_id_foreign FOREIGN KEY (wallet_id) REFERENCES public.wallets(label) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_granted_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_granted_by_foreign FOREIGN KEY (granted_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: role_permissions role_permissions_permission_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_permission_id_foreign FOREIGN KEY (permission_id) REFERENCES public.permissions(id) ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_assigned_by_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_assigned_by_foreign FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_roles user_roles_role_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_role_id_foreign FOREIGN KEY (role_id) REFERENCES public.roles(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_foreign FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_foreign FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: wallets wallets_msp_id_foreign; Type: FK CONSTRAINT; Schema: public; Owner: ibn_user
--

ALTER TABLE ONLY public.wallets
    ADD CONSTRAINT wallets_msp_id_foreign FOREIGN KEY (msp_id) REFERENCES public.organizations(msp_id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict EKdDTni3mmjgv1Kr1bKcjgkqOpDWBMGcdlenp5e4g5btGtxD6VNMEcoRazX6jXA

