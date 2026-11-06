# メモ
思い付きなどを書く



## 入れたいもの
- コレクションデータ構造
  - List, Set, Dictの使い方比較
- TEA
  - 型注釈はreplを終えてから
  - model, view, update
  - Html.Nodeの構造
- 実際のコードの雰囲気
  - 自分の書いたコードのgithubリンクを貼って見れるように
- 演習問題
- ElmPorkerを簡素化したやつを実践編で出すといいかも
  - であれば演習問題は飛ばして早めにEllieでの作業に



## 決めるべきこと
- ライセンス ← なくても困らん
- permalink対応 ← なくても困らん



## 後半に入れたい内容
- データの保存
  - URLに入れる
  - jsと連携してloaclStrage

- 手札入れ替え
  - 山札リストハードコード
    - 機能追加の開発ループに慣れる用
    - 乱数要素なし
    - 引き直しで足りなくなったらDebug.todo
  - seed入れて山札シャッフル
  - TEAのRandomを使う←これどうしよう
    - advancedな内容
    - これは「実践編プラスアルファ」ページを作る
  - Rand aの関数をnextで自力実装→nextIntを切る→andThenとmap
  - 画面遷移に基づいたModelとupdate
  - Random.GeneratorとBrowser.element
  

## Markdownに追加した記法

### コード，表，リストのキャプション

コードブロック，表，リストの前の強調のみからなる段落はキャプションとして扱われる．
キャプションはリンクできる．

**アルゴリズム1**
```
code
code
code
```

[例のアルゴリズム](#アルゴリズム1)

### answer, details, spoiler ディレクティブ

:::answer[解答例]
```
解答のコード
```
コードの解説
:::

のように記述して，ネタばれ防止のブロックを作れる．
ラベルを付けないとそれぞれ既定のsummaryになる．

キャプションは内部でも有効でリンクもできる．

### note, caution, coffee-break ディレクティブ

本文から外れた話題を分離する視覚的な囲み

:::note[補足的な話題]
補足説明です。
:::

:::caution[注意する点]
間違えやすい点です。
:::

:::coffee-break[コーヒーブレイク的話題]
脱線した話です。
:::



## html生成

node convert.js



## 作りかけ

### 画面遷移のModel設計

現状，タイトルなのか捨て札選択中なのか示す情報が無いので，`Model`に情報を持たせることにします．

持たせ方は色々考えられますが，画面によって保持する情報は結構変わるので，
今回はそのようなものを保持する`Scene`というカスタム型を作ることにしましょう．
説明の都合で役の判定も一緒に作ってしまいます．

```elm
type alias Model = Scene

type Scene
    = TitleScene
    | CardSelectScene CardSelectModel
    | ResultScene ResultModel

type alias CardSelectModel =
    { deck : List Card
    , hands : List Card
    , selected : List Bool
    , seed : Seed
    }

type alias ResultModel =
    { deck : List Card
    , hands : List Card
    , seed : Seed
    }

...
initialModel : Model
initialModel = TitleScene
```

`Model`全体を`Scene`とし，各画面ようのModelで描画（や次の画面に持ち越すため）に必要な情報を保持する設計です．

以下のように画面と対応します．

**画面遷移（SceneとModelの対応）**
```
タイトル TitleScene

↓seed設定

捨て札選択画面 CardSelectScene

↓決定 ↑続行

役判定 ResultScene
```

### 画面遷移のMsg設計

こちらは遷移に対応した3つの`Msg`を追加します．

```elm
type Msg
    = SetSeed  -- seed設定
    | Select Int Bool
    | Discard  -- 決定
    | Continue -- 続行
```

**画面遷移（遷移とMsgの対応）**
```
タイトル TitleScene

↓seed設定 SetSeed

捨て札選択画面 CardSelectScene

↓決定 Discard ↑続行 Continue

役判定 ResultScene
```

`SetSeed`に引数の`Int`が無いことを疑問に思うかもしれませんが，ボタンを押したときの`Msg`なので`Int`はありません．
seedの中身についてはまた後で考えます．

### 役判定画面（仮）を作る

役の判定の中身はおいておいて，画面だけ作ります．
今までどおり，見た目は捨て札選択画面の選択中の手札がないだけにします．続行用のボタンだけ足します．

```elm
resultView : ResultModel -> Html Msg
resultView { hands } =
    let
        cards =
            hands
                |> List.map (\card -> ( card, False ))
                |> List.indexedMap cardView
    in
        div []
            [ div [ Attr.class "card-list" ] cards
            , div [ text "ここに役" ]
            , button [ onClick Continue ] [ text "続行" ]
            ]
```

### 遷移のupdateを作る

```elm
update : Msg -> Model -> Model
update msg model =
    case ( model, msg ) of
        ( TitleScene, SetSeed ) ->  -- 遷移
            let
                ( shuffled , nextSeed ) = shuffle freshDeck (Seed 42)
            in
                CardSelectScene
                    { deck = List.tail 5 shuffled
                    , hands = List.head 5 shuffled
                    , selected = List.repeat 5 False
                    , seed = nextSeed
                    }

        ( CardSelectScene cardSelectModel, Select n value ) ->
            let
                newSelected = 
                    cardSelectModel.selected
                        |> listUpdateAt n value
            in
                CardSelectScene { cardSelectModel | selected = newSelected }

        ( CardSelectScene cardSelectModel, Discard ) ->  -- 遷移
            let
                drawNum =
                    cardSelectModel.selected
                        |> List.filter identity
                        |> List.length
                
                model_ =
                    if drawNum > List.length cardSelectModel.deck then
                        refill cardSelectModel
                    else
                        cardSelectModel
                
                ( newHands, newDeck ) = draw (zip2 model_.hands model_.selected) model_.deck
            in
                ResultScene { deck = newDeck, hands = newHands, seed = model_.seed }

        ( ResultModel resultModel, Continue ) ->  -- 遷移
            let
                ( deck, seed ) = refillDeckIfNeeded resultModel.deck resultModel.seed
            in
                CardSelectScene
                    { deck = List.tail 5 deck
                    , hands = List.head 5 deck
                    , selected = List.repeat 5 False
                    , seed = seed
                    }

refillDeckIfNeeded : List Card -> Seed -> ( List Card, Seed )
refillDeckIfNeeded deck seed =
    if List.length deck >= 5 then
        ( deck, seed )
    else
        let
            ( shuffled , nextSeed ) = shuffle freshDeck seed
        in
            deck ++ shuffled
```




value model.content, onInput Change

，input欄の表示用の`Attr.value`と


### Model設計の別解

本編は画面ごとに型を作るという設計方針でしたが，逆に，できるだけ共通化するというのも考えられます．

**全画面通して共通化したModel**
```elm
type alias Model =
    { deck : List Card
    , hands : List Card
    , selected : List Bool  -- 描画しないときは無視すればいい
    , seed : Maybe Seed  -- タイトルのときはNothingにして判別
    , seedString : String -- 入力用
    }
```

`seed : Maybe Seed`が`Nothing`のときタイトルを表示すればよく，コードの量としてはこちらの方が初心者向きかもしれません．

あえて今回こうしなかったのは，より厳密な型をつける，型で制約を表現するという感覚を知ってほしかったからです．

上記のように，どの画面でも`selected`を存在するようにすると，表示されないときにどんな値になっているかを忘れがちになります．
例えば，「役判定」から次のゲームの「捨て札選択」へ移るとき，`update`で`selected`を初期化するのか，
それとも，「役判定」に移るときにリセットしておくのか，等です．

本編のようにすると，このような曖昧な状態が存在しなくなり，また，全ての変数を埋めないと次の`Scene`型が構築できずコンパイルが通らなくなり，
全ての変数を明示することが強制されます．
