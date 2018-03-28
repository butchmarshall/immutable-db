import Immutable from 'immutable';

const _store = new WeakMap();
const _tableRecord = new WeakMap();

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
	
	createRow(tableObj, data) {
		const Record = _tableRecord.get(tableObj);
		const row = new Record(data);

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

		let map = relation.get(relationInstance.instanceRow.id) || Immutable.List();
		map = map.push(toTableObj.id);
		relation = relation.set(relationInstance.instanceRow.id, map);
		store = store.set(relationInstance.tableName, relation);

		_store.set(this, store);
	}

	getRelation(relationInstance) {
		let store = _store.get(this);

		let relation = store.get(relationInstance.tableName);
		let map = relation.get(relationInstance.instanceRow.id) || Immutable.List();

		const objects = store.get(relationInstance.toTableName);

		return store.get(relationInstance.toTableName).filter((obj) => {
			return map.includes(obj.id);
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
}

export default Database;