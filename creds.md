# 🔑 Unified Multi-Tenant Credentials Catalog

> **All accounts use password:** **`Password123`**
>
> 💡 **Single Domain Access**: Log in directly at **`http://localhost:3000/login`** using any email below. You do **not** need separate domain names or subdomain switches in your browser URL bar. The system automatically detects your organization, database (`vt_db`, `vti_db`, `nvidia_db`, `test1_db`), schema, and permissions!

---

### 🌐 1. Platform Level (Wysbryx Super Admin)
- **Database**: `vt_db` (Central Registry: `postgres`)
- **Schema**: `tenant_wysbryx`
- **Subdomain**: `wysbryx`
- **Role**: **SuperAdmin**
- **Email**: `superadmin@wysbryx.com`
- **Password**: `Password123`

---

### 🏢 2. Parent Enterprise 1: VTI Enterprise (`vti_db`)
**Database**: `vti_db`

| Level | Subdomain | Schema Name | Role | Email | Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **VTI Parent Owner** | `vti` | `tenant_vti` | **Owner** | `owner@vti.com` | `Password123` |
| **Intel Child Tenant** | `intel` | `tenant_intel` | **Admin** | `admin@intel.lms.com` | `Password123` |
| **Intel Child Tenant** | `intel` | `tenant_intel` | **Faculty** | `faculty1@intel.lms.com` | `Password123` |
| **Intel Child Tenant** | `intel` | `tenant_intel` | **Student** | `student1@student.intel.com` | `Password123` |
| **AMD Child Tenant** | `amd` | `tenant_amd` | **Admin** | `admin@amd.lms.com` | `Password123` |
| **AMD Child Tenant** | `amd` | `tenant_amd` | **Faculty** | `faculty1@amd.lms.com` | `Password123` |
| **AMD Child Tenant** | `amd` | `tenant_amd` | **Student** | `student1@student.amd.com` | `Password123` |
| **Qualcomm Child Tenant**| `qualcomm` | `tenant_qualcomm` | **Admin** | `admin@qualcomm.lms.com` | `Password123` |

---

### 💚 3. Parent Enterprise 2: NVIDIA Corporation (`nvidia_db`)
**Database**: `nvidia_db`

| Level | Subdomain | Schema Name | Role | Email | Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **NVIDIA Parent Owner** | `nvidia` | `tenant_nvidia` | **Owner** | `owner@nvidia.com` | `Password123` |
| **Gaming Division** | `gaming` | `tenant_gaming` | **Admin** | `admin@gaming.lms.com` | `Password123` |
| **Gaming Division** | `gaming` | `tenant_gaming` | **Faculty** | `faculty1@gaming.lms.com` | `Password123` |
| **Gaming Division** | `gaming` | `tenant_gaming` | **Student** | `student1@student.gaming.com` | `Password123` |
| **AI Systems** | `ai` | `tenant_ai` | **Admin** | `admin@ai.lms.com` | `Password123` |
| **AI Systems** | `ai` | `tenant_ai` | **Faculty** | `faculty1@ai.lms.com` | `Password123` |
| **Mellanox Academy** | `mellanox` | `tenant_mellanox` | **Admin** | `admin@mellanox.lms.com` | `Password123` |

---

### 🧪 4. Enterprise 3: Test Organization (`test1_db`)
**Database**: `test1_db`

| Level | Subdomain | Schema Name | Role | Email | Password |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Test Org Parent** | `test1` | `tenant_test1` | **Owner** | `owner@test1.lms.com` | `Password123` |
| **Test Org Parent** | `test1` | `tenant_test1` | **Admin** | `admin@test1.lms.com` | `Password123` |
| **Test Sub-company** | `test1-sub` | `tenant_test1_sub` | **Owner** | `owner@test1-sub.lms.com` | `Password123` |
| **Test Sub-company** | `test1-sub` | `tenant_test1_sub` | **Admin** | `admin@test1-sub.lms.com` | `Password123` |

---

### 💻 Direct PostgreSQL CLI Querying

```bash
# Query Intel schema inside VTI database:
docker exec -it coe_postgres psql -U coe_admin -d vti_db -c "SET search_path TO tenant_intel, public; SELECT email, role, first_name, last_name FROM users;"

# Query Gaming schema inside NVIDIA database:
docker exec -it coe_postgres psql -U coe_admin -d nvidia_db -c "SET search_path TO tenant_gaming, public; SELECT email, role, first_name, last_name FROM users;"

# Query Test1-Sub schema inside Test1 database:
docker exec -it coe_postgres psql -U coe_admin -d test1_db -c "SET search_path TO tenant_test1_sub, public; SELECT email, role, first_name, last_name FROM users;"
```