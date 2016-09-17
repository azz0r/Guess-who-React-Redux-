import React, { PropTypes, Component } from 'react'
import { composeResetReducer } from 'redux-reset-store'
import arrayShuffle from 'array-shuffle'
import * as PlayersActions from '../../actions/players'
import * as QuestionActions from '../../actions/questions'
import { connect } from 'react-redux'
import { toSlug, pickRandom, getNumberAsString } from './helpers'

const playerIds = {
  human: 0,
  bot: 1
}
class Who extends Component {

  static propTypes = {
    dispatch: PropTypes.func.isRequired,
    players: PropTypes.array.isRequired,
    questions: PropTypes.array.isRequired,
  }

  componentDidMount() {
    this.gameTick = setInterval(
      this.shouldBotTakeTurn,
      1000
    )
  }

  componentWillUnmount() {
    clearInterval(this.gameTick)
  }

  shouldBotTakeTurn = () => {
    if (this.props.players[playerIds.bot].currentTurn) {
      this.onsBotTurn()
    }
  }

  onResetGame = () => {
    this.props.dispatch({
      type: 'RESET'
    })
  }

  onPersonClicked = (chosenPerson) => {
    if (!this.props.players[playerIds.human].chosenPerson) {
      let
        peopleForCPU = this.props.players[playerIds.human].people.filter((person) => person.id !== chosenPerson.id),
        personForCPU = pickRandom(peopleForCPU)

      this.props.dispatch([
        PlayersActions.chosePerson(chosenPerson, playerIds.human),
        PlayersActions.chosePerson(personForCPU, playerIds.bot),
      ])
    }
  }

  getCurrentPlayerId = () => {
    return this.props.players[playerIds.human].currentTurn
      ? playerIds.human
      : playerIds.bot
  }

  getCurrentEnemyId = () => {
    return this.props.players[playerIds.human].currentTurn
      ? playerIds.bot
      : playerIds.human
  }

  onsBotTurn() {
    this.onQuestionChosen(
      this.getBotsQuestion()
    )
  }

  getBotsQuestion = () => {
    let botQuestions = this.props.questions[playerIds.bot];
    return pickRandom(botQuestions)
  }

  onQuestionChosenBot = () => {}

  onQuestionChosen = (question, event=false) => {
    if (event) {
      event.preventDefault()
    }
    let submitTurn = (playerId, question) => {
      if (this.props.players[playerId].currentTurn) {
        let enemyId = this.getCurrentEnemyId()
        this.props.dispatch([
          PlayersActions.turnConfirmed(question, playerId, enemyId),
          QuestionActions.questionUsed(question, playerId, enemyId),
        ])
      }
    }
    submitTurn(this.getCurrentPlayerId(), question)
  }

  doTheyHave = (question) => {
    let enemyPerson = this.props.players[this.getCurrentEnemyId()].chosenPerson;
    return Boolean(enemyPerson[question.key] && enemyPerson[question.key] === question.value)
  }

  _getWinner() {
    let weHaveAWinner = false,
      winnerId = false;
    this.props.players.forEach((player, key) => {
      if (player.people.filter((person) => !person.chosen).length === 1) {
        weHaveAWinner = true
        winnerId = key
      }
    })
    return {
      weHaveAWinner,
      winnerId
    }
  }

  // _getUsedQuestions() {
  //   return {
  //     botQuestionsUsed: this.props.questions[1].filter((question) => question.used),
  //     humanQuestionsUsed: this.props.questions[0].filter((question) => question.used),
  //   }
  // }

  render() {
    let
      { weHaveAWinner, winnerId } = this._getWinner()
      // { botQuestionsUsed, humanQuestionsUsed } = this._getUsedQuestions(),
    return (
      <div className="row">
        <If condition={weHaveAWinner}>
          <div className="winner col-xs-12 text-center">
            {this.props.players[winnerId].name} won the game by narrowing it down to...
            <PersonChosen person={this.props.players[(winnerId === 0 ? 1 : 0)].chosenPerson} />
          </div>
        </If>
        <div className="col-xs-12 text-center clearfix">
          <a
            href="#"
            className="btn btn-info cursor-pointer"
            onKeyPress={this.onResetGame}
            onClick={this.onResetGame}>
            {weHaveAWinner
              ? "Start Another Game?"
              : "Reset"}
          </a>
        </div>
        <div className="row human-board">
          <div className="col-xs-12 col-md-4 col-sm-4 col-lg-4 text-center">
            <If condition={!weHaveAWinner}>
              {this.props.players[playerIds.human].chosenPerson
                ? <PersonChosen person={this.props.players[playerIds.human].chosenPerson} />
                : <ChooseAPerson person={this.props.players[playerIds.human].chosenPerson} />}
            </If>
            <If condition={!weHaveAWinner}>
              <Questions
                active={this.props.players[playerIds.human].currentTurn && this.props.players[playerIds.human].chosenPerson}
                limit={5}
                shuffle
                onQuestionChosen={this.onQuestionChosen}
                questions={this.props.questions[playerIds.human]}
              />
            </If>
          </div>
          <div className="col-xs-8">
            <div className="board-wrapper">
              <People
                people={this.props.players[playerIds.human].people}
                onPersonClicked={this.onPersonClicked}
              />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(state => ({
  people: state.people,
  players: state.players,
  questions: state.questions,
}))(Who)

const UsedQuestions = ({ questions }) => {
  return (
    <ul>
      {questions.map((question, key) => {
        return (
          <li key={key}>
            {question.question}
          </li>
        );
      })}
    </ul>
  )
}

const Questions = (({ active, questions, shuffle=false, limit=false, onQuestionChosen }) => {
  let activeClass = active ? 'active' : ''
  if (shuffle) {
    questions = arrayShuffle(questions)
    questions = questions.filter((question) => !question.used)
  }
  if (limit) {
    questions = questions.slice(0, limit)
  }
  return (
    <div className={`row questions ${(activeClass)}`}>
      <div className="col-xs-16">
        <ul className="list-group">
          {questions.map((question, key) =>
            <Question
              key={key}
              onQuestionChosen={onQuestionChosen}
              question={question}
            />
          )}
        </ul>
      </div>
    </div>
  )
})

const Question = ({ question, onQuestionChosen }) => {
  let questionClasses = question.used ? 'strike-through ' : '';
  questionClasses += toSlug(question.question)
  return (
    <li className="list-group-item">
      <a href="#"
        className={questionClasses}
        onKeyPress={onQuestionChosen.bind(this, question)}
        onClick={onQuestionChosen.bind(this, question)}>
        {question.question}
      </a>
    </li>
  )
}

const People = (({ people, showNameplate, hidePersonsFace, onPersonClicked }) => {
  let
    rowNumber = 1,
    cardNumber = 1;
  return (
    <div className="board">
      {people.map((person, key) => {
        if (cardNumber === 7) {
          cardNumber = 0;
          rowNumber++;
        }
        cardNumber++
        return (
          <div
            className={`card-row ${getNumberAsString(rowNumber)}-card-row`}
            key={key}>
            <Person
              showNameplate={showNameplate}
              person={person}
              cardNumber={getNumberAsString(cardNumber)}
              onPersonClicked={onPersonClicked}
              hidePersonsFace={hidePersonsFace}
            />
          </div>
        )
      })}
    </div>
  )
})

const PersonChosen = ({ person, hidePersonsFace = false }) => {
  let slug = toSlug(person.name)
  return (
    <div className="row person-chosen">
      <div className="col-xs-12">
        <p>
          <img
            src={`/static/imgs/${slug}.png`}
            title={person.name}
            alt={person.name}
            className="avatar-img"
          />
        </p>
        </div>
      </div>
  )
}

const ChooseAPerson = () => {
  return (
    <div>
      <h4>Choose your character</h4>
      <p>Click on the user you wish to choose as your character</p>
    </div>
  )
}

const Person = ({ person, showNameplate = true, cardNumber='first', hidePersonsFace = false, onPersonClicked }) => {
  let slug = toSlug(person.name),
    chosenClass = person.chosen
      ? 'down'
      : 'up'
  const namePlate = ((name) =>
    <h4 className="hidden-xs hidden-sm">
      {name}
    </h4>
  )
  if (hidePersonsFace) {
    slug = 'hidden-person'
    person.name = 'hidden'
  }
  return (
    <div className={`${slug} ${chosenClass} ${cardNumber} card text-center`}>
      <p>
        <img
          src={`/static/imgs/${slug}.png`}
          title={person.name}
          alt={person.name}
          className="avatar-img"
          onClick={onPersonClicked ? onPersonClicked.bind(this, person) : null}
        />
      </p>
      {showNameplate ? namePlate(person.name) : ''}
    </div>
  )
}
