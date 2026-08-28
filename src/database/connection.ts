import { CapacitorSQLite, SQLiteConnection, SQLiteDBConnection } from '@capacitor-community/sqlite';
import { Capacitor } from '@capacitor/core';

let sqlite: SQLiteConnection | null = null;
let dbConnection: SQLiteDBConnection | null = null;
let connectionPromise: Promise<SQLiteDBConnection> | null = null;

export const getDatabase = async (): Promise<SQLiteDBConnection> => {
  if (dbConnection) return dbConnection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    try {
      if (!sqlite) {
        sqlite = new SQLiteConnection(CapacitorSQLite);
      }
      const platform = Capacitor.getPlatform();

      if (platform === 'web') {
        let jeepEl = document.querySelector('jeep-sqlite');
        if (!jeepEl) {
          jeepEl = document.createElement('jeep-sqlite');
          document.body.appendChild(jeepEl);
        }
        await customElements.whenDefined('jeep-sqlite');
        await sqlite.initWebStore();
      }

      const check = await sqlite.checkConnectionsConsistency();
      const isConn = (await sqlite.isConnection('localnote.db', false)).result;

      if (check.result && isConn) {
        dbConnection = await sqlite.retrieveConnection('localnote.db', false);
      } else {
        dbConnection = await sqlite.createConnection('localnote.db', false, 'no-encryption', 1, false);
      }

      await dbConnection.open();

      // WAL journal mode on native for better concurrency/performance
      if (platform !== 'web') {
        await dbConnection.execute('PRAGMA journal_mode = WAL;');
      }

      return dbConnection;
    } catch (error) {
      connectionPromise = null;
      throw error;
    }
  })();

  return connectionPromise;
};

export const closeDatabase = async (): Promise<void> => {
  if (dbConnection) {
    await dbConnection.close();
    dbConnection = null;
    connectionPromise = null;
  }
};
