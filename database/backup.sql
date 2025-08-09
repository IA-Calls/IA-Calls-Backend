--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5 (Ubuntu 17.5-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: google_vacuum_mgmt; Type: SCHEMA; Schema: -; Owner: cloudsqladmin
--

CREATE SCHEMA google_vacuum_mgmt;


ALTER SCHEMA google_vacuum_mgmt OWNER TO cloudsqladmin;

--
-- Name: google_vacuum_mgmt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS google_vacuum_mgmt WITH SCHEMA google_vacuum_mgmt;


--
-- Name: EXTENSION google_vacuum_mgmt; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION google_vacuum_mgmt IS 'extension for assistive operational tooling';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    description text,
    ip_address inet,
    user_agent text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.activity_logs OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO postgres;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: client_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.client_groups (
    id integer NOT NULL,
    client_id integer,
    group_id integer,
    assigned_by integer,
    assigned_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.client_groups OWNER TO postgres;

--
-- Name: TABLE client_groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.client_groups IS 'Relación muchos a muchos entre clientes y grupos';


--
-- Name: client_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.client_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.client_groups_id_seq OWNER TO postgres;

--
-- Name: client_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.client_groups_id_seq OWNED BY public.client_groups.id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    id integer NOT NULL,
    external_id character varying(255),
    name character varying(255) NOT NULL,
    phone character varying(50) NOT NULL,
    email character varying(255),
    address text,
    category character varying(100),
    review text,
    status character varying(50) DEFAULT 'pending'::character varying,
    metadata jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: TABLE clients; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.clients IS 'Tabla local de clientes sincronizada con servicio externo';


--
-- Name: COLUMN clients.external_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.external_id IS 'ID del cliente en el servicio externo para sincronización';


--
-- Name: COLUMN clients.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.clients.metadata IS 'Datos adicionales del servicio externo en formato JSON';


--
-- Name: clients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_id_seq OWNER TO postgres;

--
-- Name: clients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_id_seq OWNED BY public.clients.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#3B82F6'::character varying,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    prompt text,
    favorite boolean DEFAULT false
);


ALTER TABLE public.groups OWNER TO postgres;

--
-- Name: TABLE groups; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.groups IS 'Grupos para organizar y categorizar clientes';


--
-- Name: COLUMN groups.color; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.groups.color IS 'Color en formato hex para la UI (#RRGGBB)';


--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO postgres;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    first_name character varying(100),
    last_name character varying(100),
    role character varying(20) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'admin'::character varying, 'moderator'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: client_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups ALTER COLUMN id SET DEFAULT nextval('public.client_groups_id_seq'::regclass);


--
-- Name: clients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN id SET DEFAULT nextval('public.clients_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_logs (id, user_id, action, description, ip_address, user_agent, metadata, created_at) FROM stdin;
1	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; es-CO) WindowsPowerShell/5.1.26100.4202	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:05:33.586Z"}	2025-07-03 04:05:33.19691+00
2	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; es-CO) WindowsPowerShell/5.1.26100.4202	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:05:37.027Z"}	2025-07-03 04:05:36.64678+00
3	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; es-CO) WindowsPowerShell/5.1.26100.4202	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:06:06.141Z"}	2025-07-03 04:06:05.754035+00
4	1	login	Login exitoso	::1	axios/1.10.0	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:07:45.443Z"}	2025-07-03 04:07:45.063485+00
5	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:11:57.907Z"}	2025-07-03 04:11:57.519723+00
6	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:12:15.270Z"}	2025-07-03 04:12:14.878503+00
7	1	login	Login exitoso	::1	axios/1.10.0	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:16:33.281Z"}	2025-07-03 04:16:32.890291+00
8	1	login	Login exitoso	::1	axios/1.10.0	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:18:00.649Z"}	2025-07-03 04:18:00.25168+00
9	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT; Windows NT 10.0; es-CO) WindowsPowerShell/5.1.26100.4202	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:18:58.240Z"}	2025-07-03 04:18:57.835808+00
10	1	login	Login exitoso	::1	axios/1.10.0	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:19:25.320Z"}	2025-07-03 04:19:24.92348+00
11	1	login	Login exitoso	::1	axios/1.10.0	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:20:47.512Z"}	2025-07-03 04:20:47.114793+00
12	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T04:33:04.956Z"}	2025-07-03 04:33:04.546944+00
13	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T06:54:12.201Z"}	2025-07-03 06:54:11.67294+00
14	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T07:03:02.052Z"}	2025-07-03 07:03:01.509936+00
15	1	login	Login exitoso	::1	axios/1.10.0	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T07:06:17.914Z"}	2025-07-03 07:06:17.373563+00
16	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T07:08:53.843Z"}	2025-07-03 07:08:53.300967+00
17	1	user_created	Usuario test creado	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/users", "method": "POST", "timestamp": "2025-07-03T07:15:04.290Z", "createdUserId": 3}	2025-07-03 07:15:03.738664+00
18	3	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T07:15:21.828Z"}	2025-07-03 07:15:21.276948+00
19	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-03T07:15:32.557Z"}	2025-07-03 07:15:32.007372+00
20	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-22T04:35:25.159Z"}	2025-07-22 04:35:25.128099+00
21	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-22T18:18:11.783Z"}	2025-07-22 18:18:11.380245+00
22	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-22T22:54:05.614Z"}	2025-07-22 22:54:05.611244+00
23	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-23T16:41:23.101Z"}	2025-07-23 16:41:22.703369+00
24	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-23T18:29:52.884Z"}	2025-07-23 18:29:52.392852+00
25	1	user_updated	Usuario test actualizado	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/users/3", "method": "PUT", "changes": ["username", "email", "role"], "timestamp": "2025-07-23T18:36:47.181Z", "updatedUserId": 3}	2025-07-23 18:36:46.684731+00
26	1	user_updated	Usuario test actualizado	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/users/3", "method": "PUT", "changes": ["username", "email", "role"], "timestamp": "2025-07-23T18:37:09.922Z", "updatedUserId": 3}	2025-07-23 18:37:09.436593+00
27	1	user_updated	Usuario test actualizado	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/users/3", "method": "PUT", "changes": ["username", "email", "role"], "timestamp": "2025-07-23T18:39:15.611Z", "updatedUserId": 3}	2025-07-23 18:39:15.113637+00
28	1	user_updated	Usuario test actualizado	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/users/3", "method": "PUT", "changes": ["username", "email", "role"], "timestamp": "2025-07-23T18:39:46.035Z", "updatedUserId": 3}	2025-07-23 18:39:45.537468+00
29	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-23T18:40:34.183Z"}	2025-07-23 18:40:33.687527+00
30	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-07-31T21:16:55.282Z"}	2025-07-31 21:16:55.809232+00
31	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-08-01T03:18:33.747Z"}	2025-08-01 03:18:34.47342+00
32	1	login	Login exitoso	::1	Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	{"url": "/api/auth/login", "method": "POST", "timestamp": "2025-08-02T19:42:05.024Z"}	2025-08-02 19:42:05.174578+00
\.


--
-- Data for Name: client_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.client_groups (id, client_id, group_id, assigned_by, assigned_at) FROM stdin;
1	1	1	1	2025-07-23 17:05:03.876819+00
3	2	19	\N	2025-08-02 19:36:36.031586+00
4	3	19	\N	2025-08-02 19:36:36.033451+00
5	4	19	\N	2025-08-02 19:36:36.039974+00
6	5	19	\N	2025-08-02 19:36:36.445174+00
7	6	19	\N	2025-08-02 19:36:36.457499+00
\.


--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.clients (id, external_id, name, phone, email, address, category, review, status, metadata, is_active, created_at, updated_at) FROM stdin;
1	\N	Daniel giraldo	+573104819492	\N	\N	General	a	pending	{"_id": "6877c25ec808de713fe0f3ac", "web": "awww.porno.com", "mail": "danyelle@gmail.com", "name": "Daniel giraldo", "phone": "+573104819492", "state": "pending", "adress": "guanatr", "length": "123123", "review": "a", "category": "General", "latitude": "12312312", "ubication": "el pedazo", "total_calls": 0}	t	2025-07-23 17:03:40.445842+00	2025-07-23 17:03:40.445842+00
2	\N	Juan Pérez	+573001234567	juan.perez@example.com	Calle 123 #45-67, Bogotá	General	Cliente potencial	pending	{"row": 2, "source": "excel_upload", "filename": "clientes_ejemplo.xlsx", "extracted_at": "2025-08-02T19:36:34.851Z"}	t	2025-08-02 19:34:01.318222+00	2025-08-02 19:36:35.111606+00
3	\N	María García	+573007654321	maria.garcia@example.com	Avenida 89 #12-34, Medellín	VIP	Cliente de alto valor	pending	{"row": 3, "source": "excel_upload", "filename": "clientes_ejemplo.xlsx", "extracted_at": "2025-08-02T19:36:34.851Z"}	t	2025-08-02 19:34:01.53024+00	2025-08-02 19:36:35.315557+00
4	\N	Carlos López	+573001112223	carlos.lopez@example.com	Carrera 56 #78-90, Cali	General	Nuevo prospecto	pending	{"row": 4, "source": "excel_upload", "filename": "clientes_ejemplo.xlsx", "extracted_at": "2025-08-02T19:36:34.851Z"}	t	2025-08-02 19:34:01.758256+00	2025-08-02 19:36:35.52764+00
5	\N	Ana Rodríguez	+573004445556	ana.rodriguez@example.com	Calle 78 #90-12, Barranquilla	VIP	Cliente frecuente	pending	{"row": 5, "source": "excel_upload", "filename": "clientes_ejemplo.xlsx", "extracted_at": "2025-08-02T19:36:34.851Z"}	t	2025-08-02 19:34:01.954297+00	2025-08-02 19:36:35.731623+00
6	\N	Luis Martínez	+573007778889	luis.martinez@example.com	Avenida 34 #56-78, Bucaramanga	General	Interesado en servicios premium	pending	{"row": 6, "source": "excel_upload", "filename": "clientes_ejemplo.xlsx", "extracted_at": "2025-08-02T19:36:34.851Z"}	t	2025-08-02 19:34:02.154249+00	2025-08-02 19:36:35.93159+00
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.groups (id, name, description, color, is_active, created_by, created_at, updated_at, prompt, favorite) FROM stdin;
1	VIP Clientes	Clientes prioritarios con alta conversión	#10B981	t	1	2025-07-23 17:02:35.052287+00	2025-07-23 17:02:35.052287+00	\N	f
18	updated test	updated description	#FF00FF	f	1	2025-07-31 22:47:13.917849+00	2025-07-31 23:12:10.387023+00	updated prompt	f
2	Seguimiento Semanal	Clientes que requieren seguimiento regular	#F59E0B	f	1	2025-07-23 17:02:35.052287+00	2025-07-31 23:12:16.804897+00	\N	f
17	test karol	test	#00ffb3	f	1	2025-07-31 22:46:34.949745+00	2025-08-01 03:29:50.59723+00	test prompt 123	t
20	karol test 2	2	#3B82F6	f	1	2025-08-01 03:51:04.580289+00	2025-08-01 04:37:25.184467+00	2	f
21	asd	asd	#f73be7	f	1	2025-08-01 04:37:46.475632+00	2025-08-01 16:51:50.169843+00	asd	f
16	test direct	test direct	#FF0000	f	1	2025-07-31 22:45:44.372242+00	2025-08-02 19:44:18.2329+00	test prompt direct	t
19	karol test	Clientes Doctores para envento de meet 	#f7e73b	t	1	2025-08-01 03:47:53.140349+00	2025-08-02 19:44:42.82774+00	test	f
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, username, email, password, first_name, last_name, role, is_active, created_at, updated_at) FROM stdin;
1	admin	admin@iacalls.com	$2a$12$AxETu4R0//DfWmrwteYdt.E3OMlEYS2TXHxcrL1Ih0dd.66H.R8Ri	Administrador	Sistema	admin	t	2025-07-03 03:54:53.507077+00	2025-07-03 04:05:21.402079+00
2	testuser	test@iacalls.com	$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	Usuario	Prueba	user	f	2025-07-03 03:54:53.507077+00	2025-07-23 18:35:41.33214+00
3	test	test@gmail.com	$2a$12$M2Ky.j8UAz9W/pzLtnT9nuSVfIgVCjo75t6Zev3UJNZ6.0KbxKUB2	\N	\N	user	t	2025-07-03 07:15:03.472527+00	2025-07-23 18:39:45.373963+00
\.


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 32, true);


--
-- Name: client_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.client_groups_id_seq', 7, true);


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.clients_id_seq', 6, true);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.groups_id_seq', 21, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: client_groups client_groups_client_id_group_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_client_id_group_id_key UNIQUE (client_id, group_id);


--
-- Name: client_groups client_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_pkey PRIMARY KEY (id);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (id);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: idx_client_groups_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_groups_client_id ON public.client_groups USING btree (client_id);


--
-- Name: idx_client_groups_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_client_groups_group_id ON public.client_groups USING btree (group_id);


--
-- Name: idx_clients_category; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_category ON public.clients USING btree (category);


--
-- Name: idx_clients_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_email ON public.clients USING btree (email);


--
-- Name: idx_clients_external_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_external_id ON public.clients USING btree (external_id);


--
-- Name: idx_clients_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_is_active ON public.clients USING btree (is_active);


--
-- Name: idx_clients_phone; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_phone ON public.clients USING btree (phone);


--
-- Name: idx_clients_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_status ON public.clients USING btree (status);


--
-- Name: idx_groups_created_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_groups_created_by ON public.groups USING btree (created_by);


--
-- Name: idx_groups_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_groups_is_active ON public.groups USING btree (is_active);


--
-- Name: idx_groups_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_groups_name ON public.groups USING btree (name);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_is_active ON public.users USING btree (is_active);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: idx_users_username; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_username ON public.users USING btree (username);


--
-- Name: clients update_clients_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: groups update_groups_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: client_groups client_groups_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: client_groups client_groups_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;


--
-- Name: client_groups client_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.client_groups
    ADD CONSTRAINT client_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE CASCADE;


--
-- Name: groups groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: SCHEMA google_vacuum_mgmt; Type: ACL; Schema: -; Owner: cloudsqladmin
--

GRANT USAGE ON SCHEMA google_vacuum_mgmt TO cloudsqlsuperuser;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT ALL ON SCHEMA public TO cloudsqlsuperuser;


--
-- PostgreSQL database dump complete
--

