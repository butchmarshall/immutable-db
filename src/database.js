import Immutable from 'immutable';
import uuidv4 from 'uuid/v4';

const _store = new WeakMap();
const _tableRecord = new WeakMap();

export const ROW_UUID_NAMESPACE = '7020a680-322c-11e8-b467-0ed5f89f718b';

class Database {
	constructor() {
		// Where the data goes
		_store.set(this, new Immutable.Map({}));
	}
	addTable(tableObj) {
		this[tableObj.tableName] = tableObj;
		tableObj.setDatabase(this);

		let store = _store.get(this);
		store = store.set(tableObj.tableName, Immutable.List());

		tableObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				store = store.set(tableObj.tableName+"_"+relation.hasMany, Immutable.Map());
			}
		});

		_store.set(this, store);
	}

	getRow(tableObj, id) {
		let store = _store.get(this);
		let table = store.get(tableObj.tableName);

		for(var i = 0; i < table.size; i++) {
			if (table.get(i).id === id) {
				return table.get(i);
			}
		}
	}

	updateRow(tableObj, row, data) {
		const uuid = row.uuid;
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
		for(var k in methods) {
			row[k] = methods[k];
		}

		let store = _store.get(this);

		let table = store.get(tableObj.tableName);
		for(var i = 0; i < table.size; i++) {
			if (table.get(i).uuid == uuid) {
				row.uuid = uuid;
				table = table.set(i, row);

				break;
			}
		}

		store = store.set(tableObj.tableName, table);
		_store.set(this, store);

		return row;
	}

	createRow(tableObj, data, uuid = null) {
		const Record = _tableRecord.get(tableObj);
		const row = new Record(data);
		row.uuid = uuid || uuidv4();
		row.update = tableObj.update.bind(tableObj, row);

		tableObj.relations.forEach((relation) => {
			if (relation.hasMany) {
				row[relation.hasMany] = new Relation(this, tableObj, row, relation.hasMany);
			}
		});

		let store = _store.get(this);
		store = store.set(tableObj.tableName, store.get(tableObj.tableName).push(row));
		_store.set(this, store);

		return row;
	}

	createRelation(relationInstance, toTableObj) {
		let store = _store.get(this);

		let relation = store.get(relationInstance.tableName);

		let map = relation.get(relationInstance.instanceRow.uuid) || Immutable.List();
		map = map.push(toTableObj.uuid);
		relation = relation.set(relationInstance.instanceRow.uuid, map);
		store = store.set(relationInstance.tableName, relation);

		_store.set(this, store);
	}

	getRelation(relationInstance) {
		let store = _store.get(this);

		let relation = store.get(relationInstance.tableName);
		let map = relation.get(relationInstance.instanceRow.uuid) || Immutable.List();

		const objects = store.get(relationInstance.toTableName);

		return store.get(relationInstance.toTableName).filter((obj) => {
			return map.includes(obj.uuid);
		});
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

	// Get associated objects
	get() {
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
}

export class Table {
	constructor(tableName, schemaDef, relations = []) {
		// Immutable Record to use for this table
		_tableRecord.set(this,
			class TableRecord extends Immutable.Record(schemaDef.reduce((accum, item) => { accum[item] = undefined; return accum; }, {}), tableName) {
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

	get(id) {
		return this.database.getRow(this, id);
	}

	create(data) {
		return this.database.createRow(this, data);
	}
	
	update(row, data) {
		return this.database.updateRow(this, row, data);
	}
}

export default Database;