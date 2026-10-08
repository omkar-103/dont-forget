# MongoDB Atlas Setup Guide for "Don't Forget" Attendance Tracking

This application integrates with **MongoDB Atlas** as the persistent cloud database for tracking college subjects and attendance records (theory and practical).

---

## 1. Create a MongoDB Atlas Cluster
1. Sign up or log in at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a new project or select an existing one.
3. Click **Create** to deploy a free **M0 Sandbox** cluster (shared tier).
4. Select your preferred cloud provider (AWS / Google Cloud / Azure) and region.

---

## 2. Create Database & User Credentials
1. Under the **Security** section on the left sidebar, click **Database Access**.
2. Click **Add New Database User**.
3. Choose **Password** authentication.
4. Set a username (e.g. `dontforget_user`) and a secure password.
5. Under **Database User Privileges**, select **Read and write to any database** (or assign privileges to `dont-forget`).
6. Click **Add User**.

---

## 3. Configure Network Access
1. Under **Security**, click **Network Access**.
2. Click **Add IP Address**.
3. To allow connections from cloud hosting or development, choose **Allow Access From Anywhere** (`0.0.0.0/0`), or enter your specific static server IP address.
4. Click **Confirm**.

---

## 4. Obtain Your Connection String
1. Go to **Deployment** > **Database**.
2. Click **Connect** next to your cluster name.
3. Select **Drivers** (Node.js).
4. Copy the SRV connection URI:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your database user credentials.

---

## 5. Configure Environment Variables
In your deployment environment (or local `.env` file):

```bash
# Connection URI for MongoDB Atlas cluster
MONGODB_URI="mongodb+srv://USERNAME:PASSWORD@CLUSTER.mongodb.net/?retryWrites=true&w=majority"

# Database name (defaults to 'dont-forget')
MONGODB_DB_NAME="dont-forget"
```

> **Security Note:** Never commit `.env` containing actual database passwords to version control. The app includes `.env.example` with safe placeholders.

---

## 6. Verify Connection & Test Attendance CRUD
1. Start the application:
   ```bash
   npm run dev
   ```
2. Open the **Attendance** tab in the top or bottom navigation.
3. Check the connection pill in the header:
   - **Atlas Synced**: Live connection to your MongoDB Atlas cluster.
   - **MongoDB Storage (Local Fallback)**: Active if `MONGODB_URI` is not yet configured, ensuring the application remains interactive and failure-isolated.
4. Record an attendance event (+ Record Attendance) for Theory or Practical.
5. Verify that percentages, lowest subject indicators, and classes needed update in real-time.
