import Immutable from 'immutable';
import uuidv4 from 'uuid/v4';

const _store = new WeakMap();
const _tableRecord = new WeakMap();

export const ROW_UUID_NAMESPACE = '7020a680-322c-11e8-b467-0ed5f89f718b';

class TableStorage extends Immutable.Record({
	primaryKey: "id",
	byUUID: Immutable.Map(),
	byPrimaryKey: Immutable.Map(),
}, "TableStorage") {
	getRowsByUUID(__uuids) {
		return this.byUUID.filter((v,k) => {
			return __uuids.includes(k);
		}).toList();
	}
	getRowByPrimaryKey(key) {
		return this.getRowByUUID(this.byPrimaryKey.get(key));
	}
	getRowByUUID(__uuid) {
		return this.byUUID.get(__uuid);
	}
	insertRow(row) {
		let byUUID = this.byUUID.set(row.__uuid, row),
		byPrimaryKey = this.byPrimaryKey.set(row[this.primaryKey], row.__uuid);

		let that = this.set("byUUID", byUUID);
		that = that.set("byPrimaryKey", byPrimaryKey);

		return that;
	}
	removeRow(row) {
		let byUUID = this.byUUID.remove(row.__uuid),
		byPrimaryKey = this.byPrimaryKey.remove(row[this.primaryKey]);

		let that = this.set("byUUID", byUUID);
		that = that.set("byPrimaryKey", byPrimaryKey);

		return that;
	}
}

let __uuid_count = 1;
class Database {
	constructor() {
		// Where the data goes
		_store.set(this, new Immutable.Map({}));
	}
	addTable(tableObj) {
		this[tableObj.tableName] = tableObj;
		tableObj.setDatabase(this);

		let store = _store.get(this);
		store = store.set(tableObj.tableName, new TableStorage());

		tableObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				store = store.set(tableObj.tableName+"_"+relation.hasMany, Immutable.Map({}));
			}
		});

		_store.set(this, store);
	}

	getRowByPrimaryKey(tableObj, id) {
		let store = _store.get(this);

		return store.get(tableObj.tableName).getRowByPrimaryKey(id);
	}

	updateRow(tableObj, row, data) {
		const __uuid = row.__uuid;
		let methods = {};
		for(var k in tableObj.relations) {
			if (tableObj.relations[k].hasMany) {
				methods[tableObj.relations[k].hasMany] = row[tableObj.relations[k].hasMany];
			}
			if (tableObj.relations[k].belongsTo) {
				methods[tableObj.relations[k].belongsTo] = row[tableObj.relations[k].belongsTo];
			}
		}

		row = row.merge(data);
		row.__uuid = __uuid;
		for(var k in methods) {
			row[k] = methods[k];
		}

		let store = _store.get(this);

		let tableStorage = store.get(tableObj.tableName);
		tableStorage = tableStorage.insertRow(row);

		store = store.set(tableObj.tableName, tableStorage);
		_store.set(this, store);

		return row;
	}

	createRow(tableObj, data, __uuid = null) {
		const Record = _tableRecord.get(tableObj);
		const row = new Record(data);
		row.__uuid = __uuid || uuidv4();
		row.update = tableObj.update.bind(tableObj, row);

		tableObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				row[relation.hasMany] = new Relation(this, tableObj, row, relation.hasMany);
			}
		});

		let store = _store.get(this),
		tableStorage = store.get(tableObj.tableName);
		tableStorage = tableStorage.insertRow(row);

		store = store.set(tableObj.tableName, tableStorage);
		_store.set(this, store);

		return row;
	}

	removeRow(tableObj, row) {
		let store = _store.get(this),
		tableStorage = store.get(tableObj.tableName);
		tableStorage = tableStorage.removeRow(row);
		store = store.set(tableObj.tableName, tableStorage);

		tableObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				row[relation.hasMany] = new Relation(this, tableObj, row, relation.hasMany);
			}
		});

		_store.set(this, store);
	}

	createRelation(relationInstance, row) {
		let store = _store.get(this);

		let tableStorage = store.get(relationInstance.tableName);

		let map = tableStorage.get(relationInstance.instanceRow.__uuid) || Immutable.List();
		map = map.push(row.__uuid);
		tableStorage = tableStorage.set(relationInstance.instanceRow.__uuid, map);
		store = store.set(relationInstance.tableName, tableStorage);

		_store.set(this, store);
	}

	removeRelation(relationInstance, row) {
		let store = _store.get(this);

		let tableStorage = store.get(relationInstance.tableName);

		let map = tableStorage.get(relationInstance.instanceRow.__uuid) || Immutable.List();
		map = map.filter((__uuid) => {
			return __uuid !== row.__uuid;
		});
		tableStorage = tableStorage.set(relationInstance.instanceRow.__uuid, map);
		store = store.set(relationInstance.tableName, tableStorage);

		_store.set(this, store);
	}

	getRelation(relationInstance) {
		let store = _store.get(this);

		let relation = store.get(relationInstance.tableName);
		let list = relation.get(relationInstance.instanceRow.__uuid) || Immutable.List();

		const objects = store.get(relationInstance.toTableName);

		const tableStorage = store.get(relationInstance.toTableName);

		return tableStorage.getRowsByUUID(list);
	}

	toJS() {
		return _store.get(this).toJS();
	}
}

export class Relation {
	constructor(database, tableObj, instanceRow, toTableName) {
		this.database = database;
		this.tableObj = tableObj;
		this.instanceRow = instanceRow;
		this.toTableName = toTableName;

		this.tableName = tableObj.tableName+"_"+toTableName;
	}

	// Get all the associated objects
	all() {
		return this.database.getRelation(this);
	}

	// Add a relationship to another instance
	add(instance) {
		this.database.createRelation(this, instance);

		this.database[this.toTableName].relations.forEach((relation) => {
			if (relation.belongsTo) {
				instance[relation.belongsTo] = this.instanceRow;
			}
		});
	}

	// Remove a relationship to another instance
	remove(instance) {
		this.database.removeRelation(this, instance);
	}
}

export class Table {
	constructor(tableName, schemaDef, relations = []) {
		// Immutable Record to use for this table
		_tableRecord.set(this,
			class TableRecord extends Immutable.Record(
				schemaDef.reduce(
					(accum, item) => {
						accum[item] = undefined;
						return accum;
					},
					{}
				), tableName) {
			}
		);

		this.tableName = tableName;
		this.relations = relations;
		this.database = null;
	}

	setDatabase(database) {
		if (this.database !== null) {
			throw Error("cannot set two databases");
		}
		this.database = database;
	}

	getRowByPrimaryKey(key) {
		return this.database.getRowByPrimaryKey(this, key);
	}

	create(data) {
		return this.database.createRow(this, data);
	}
	remove(row) {
		return this.database.removeRow(this, row);
	}
	
	update(row, data) {
		return this.database.updateRow(this, row, data);
	}
}

export default Database;