import ORM, { Model } from './index';

describe("ORM", () => {
	const orm = new ORM();
	const questionsModel = new Model('questions', [
		'id',
		'name',
	], {
		primaryKey: 'id',
		hasMany: 'answers',
	});
	const answersModel = new Model('answers', [
		'id',
		'name',
	], {
		primaryKey: 'id',
		belongsTo: 'question',
	});

	orm.addModel(questionsModel);
	orm.addModel(answersModel);

	let answers = [];
	let questions = [];

	// ----------------------------------------------------------------------------
	// First question
	// ----------------------------------------------------------------------------
	questions.push(questionsModel.create({
		id: 1,
		name: "How are you?"
	}));
	answers.push(answersModel.create({
		id: 1,
		name: "Great!",
	}));
	questions[0].answers.add(answers[0]);
	answers.push(answersModel.create({
		id: 2,
		name: "Good!",
	}));
	questions[0].answers.add(answers[1]);
	answers.push(answersModel.create({
		id: 3,
		name: "FINE!",
	}));
	questions[0].answers.add(answers[2]);

	// ----------------------------------------------------------------------------
	// Second question
	// ----------------------------------------------------------------------------
	questions.push(questionsModel.create({
		id: 2,
		name: "What is your favorite food?"
	}));
	answers.push(answersModel.create({
		id: 4,
		name: "Pizza!",
	}));
	questions[1].answers.add(answers[3]);
	answers.push(answersModel.create({
		id: 5,
		name: "Hot Dogs!",
	}));
	questions[1].answers.add(answers[4]);
	answers.push(answersModel.create({
		id: 6,
		name: "Spagetti!",
	}));
	questions[1].answers.add(answers[5]);
	answers.push(answersModel.create({
		id: 7,
		name: "Potatoes!",
	}));
	questions[1].answers.add(answers[6]);

	console.log(orm.toJS());

	it ('should allow fetching individual records', () => {
		expect(orm.questions.getRowByPrimaryKey(1)).toEqual(questions[0]);
		expect(orm.questions.getRowByPrimaryKey(2)).toEqual(questions[1]);

		answers.forEach((answer, answer_index) => {
			expect(orm.answers.getRowByPrimaryKey(answer_index+1)).toEqual(answers[answer_index]);
		});

		expect(orm.answers.getRowByPrimaryKey(1).question).toEqual(questions[0]);
		expect(orm.answers.getRowByPrimaryKey(7).question).toEqual(questions[1]);
	});

	it ('should allow updating individual records', () => {
		expect(orm.questions.getRowByPrimaryKey(1)).toEqual(questions[0]);

		orm.questions.getRowByPrimaryKey(1).update({name: "How are you doing this fine evening?"});

		// The property should change
		expect(orm.questions.getRowByPrimaryKey(1).name).toBe("How are you doing this fine evening?");
		// The references should remain
		expect(orm.questions.getRowByPrimaryKey(1).answers.all().size).toEqual(3);
		// References object should change
		expect(orm.questions.getRowByPrimaryKey(1)).not.toEqual(questions[0]);

		// Set new ref - otherwise we're dealing with something old!
		questions[0] = orm.questions.getRowByPrimaryKey(1);

		orm.answers.getRowByPrimaryKey(1).update({name:"Great thanks for asking!"});
		expect(orm.answers.getRowByPrimaryKey(1)).not.toEqual(answers[0]);
		// Set new ref - otherwise we're dealing with something old!
		answers[0] = orm.answers.getRowByPrimaryKey(1);
	});

	it ('should return belongsTo relationships', () => {
		expect(orm.answers.getRowByPrimaryKey(1).question).toEqual(questions[0]);
		expect(orm.answers.getRowByPrimaryKey(7).question).toEqual(questions[1]);
	});

	it ('should return hasMany relationships', () => {
		expect(questions[0].answers.all().size).toEqual(3);
		expect(questions[1].answers.all().size).toEqual(4);

		// Ensure that the returned answers have the same reference
		let equalityChecks = 0;
		questions[0].answers.all().forEach((answer, answer_index) => {
			expect(answer).toEqual(answers[answer.id-1]);

			equalityChecks++;
		});
		questions[1].answers.all().forEach((answer, answer_index) => {
			expect(answer).toEqual(answers[answer.id-1]);

			equalityChecks++;
		});
		expect(equalityChecks).toEqual(7);
	});

	it ('should allow removing relationships', () => {
		questions[0].answers.remove(answers[0]);

		expect(questions[0].answers.all().size).toEqual(2);

		expect(orm.answers.getRowByPrimaryKey(1).question).toEqual(undefined);
	});

	it ('should allow removing records and cleaning up associations', () => {
		orm.questions.remove(questions[0]);

		expect(orm.questions.getRowByPrimaryKey(1)).toEqual(undefined);

		expect(orm.answers.getRowByPrimaryKey(3).question).toEqual(undefined);
	});

	it ('should do something', () => {
	});
});